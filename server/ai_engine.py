import subprocess
import os
import cv2
import threading
from collections import deque
from ai_state_machine import StateMachine

# YOLOv8
try:
    from ultralytics import YOLO
    AI_ENABLED = True
except ImportError:
    AI_ENABLED = False
    print("WARNING: ultralytics (YOLO) not installed. AI disabled.")

# Base de datos de la web app
from extensions import db
from models.notifications import Notifications
from models.incidents import Incidents
from models.detections import Detections
from models.videos import Videos

class AIEngine:
    def __init__(self, app_context):
        self.app_context = app_context
        self.enabled = AI_ENABLED
        self.model = None
        self.trash_model = None
        self.state_machine = StateMachine(abandonment_time=10.0, distance_threshold=150)
        self.person_history = {}
        self.video_buffer = deque(maxlen=300) # 10 segundos a 30fps
        # Directorio para guardar evidencias físicas (fotos/videos)
        self.evidence_dir = os.path.join(os.getcwd(), 'static', 'evidences')
        os.makedirs(self.evidence_dir, exist_ok=True)

        if self.enabled:
            # 1. Cargar modelo base oficial para Personas y Vehiculos
            base_path = "yolov8n.pt"
            print(f"[AI ENGINE] Cargando modelo base de Personas y Vehículos ({base_path})...")
            self.model = YOLO(base_path)

            # 2. Cargar modelo especializado de basura (best.pt) si existe en la carpeta
            trash_path = os.getenv("YOLO_TRASH_MODEL_PATH", "best.pt")
            if os.path.exists(trash_path):
                print(f"[AI ENGINE] ¡Modelo experto de basura detectado!: {trash_path} (Modo Dual Activo)")
                try:
                    self.trash_model = YOLO(trash_path)
                except Exception as e:
                    print(f"[AI ENGINE ERROR] No se pudo cargar {trash_path}: {e}")
                    self.trash_model = None
            else:
                print(f"[AI ENGINE] Nota: '{trash_path}' no encontrado aún. Modo fallback activo (mochilas como residuos).")
                self.trash_model = None

    def _is_person_clothing_noise(self, t_box, persons):
        """
        Evita que la ropa, pecho, torso o silueta de una persona se clasifique
        falsamente como bolsa de basura (solo debe quedar como silueta verde de Persona).
        """
        tx1, ty1, tx2, ty2 = t_box
        t_area = max(1.0, (tx2 - tx1) * (ty2 - ty1))
        t_cx = (tx1 + tx2) / 2.0
        t_cy = (ty1 + ty2) / 2.0

        for p_box in persons.values():
            px1, py1, px2, py2 = p_box
            p_area = max(1.0, (px2 - px1) * (py2 - py1))

            # Intersección
            ix1 = max(tx1, px1)
            iy1 = max(ty1, py1)
            ix2 = min(tx2, px2)
            iy2 = min(ty2, py2)
            inter_w = max(0.0, ix2 - ix1)
            inter_h = max(0.0, iy2 - iy1)
            inter_area = inter_w * inter_h

            overlap_on_trash = inter_area / t_area
            overlap_on_person = inter_area / p_area

            # Caso 1: La supuesta basura está mayormente contenida en el cuerpo de la persona (>55%)
            if overlap_on_trash > 0.55:
                # Si el centro está en la zona superior/media del cuerpo (pecho, torso, brazos, cabeza)
                if t_cy < (py1 + 0.75 * (py2 - py1)):
                    return True
                # O si abarca una porción considerable de la persona (>15% de su área)
                if overlap_on_person > 0.15:
                    return True

            # Caso 2: El modelo de basura detectó a la persona completa (alto IoU)
            union_area = t_area + p_area - inter_area
            iou = inter_area / max(1.0, union_area)
            if iou > 0.30:
                return True

            # Caso 3: El centro de la supuesta basura está ubicado directamente en el torso de la persona
            if (px1 <= t_cx <= px2) and (py1 <= t_cy <= (py1 + 0.70 * (py2 - py1))):
                if overlap_on_trash > 0.35:
                    return True

        return False

    def process_frame(self, frame):
        if not self.enabled or self.model is None:
            return frame

        self.video_buffer.append(frame.copy())
        persons = {}
        trashes = {}

        # -----------------------------------------------------------------
        # 1. RASTREO CON MODELO BASE: PERSONAS
        # Clases COCO: 0: person (ignoramos vehículos por ahora)
        # Si no hay modelo de basura, incluimos mochilas (24, 26, 28) como fallback
        # -----------------------------------------------------------------
        base_classes = [0] if self.trash_model else [0, 24, 26, 28]
        try:
            base_results = self.model.track(
                frame, 
                persist=True, 
                verbose=False, 
                classes=base_classes, 
                conf=0.35, 
                tracker="botsort.yaml"
            )

            if base_results and base_results[0].boxes.id is not None:
                boxes = base_results[0].boxes.xyxy.cpu().numpy()
                track_ids = base_results[0].boxes.id.int().cpu().tolist()
                classes = base_results[0].boxes.cls.int().cpu().tolist()

                for box, track_id, cls in zip(boxes, track_ids, classes):
                    x1, y1, x2, y2 = map(int, box)
                    if cls == 0:
                        # Persona: silueta verde limpia, sin ID
                        persons[track_id] = box
                        self.person_history[track_id] = (box, frame.copy())
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        cv2.putText(frame, "Persona", (x1, max(15, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                    elif cls in [24, 26, 28] and not self.trash_model:
                        # Modo fallback (mochila)
                        trashes[track_id] = box
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                        cv2.putText(frame, "Residuo", (x1, max(15, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        except Exception as e:
            pass

        # -----------------------------------------------------------------
        # 2. RASTREO CON MODELO EXPERTO DE BASURA (best.pt)
        # -----------------------------------------------------------------
        if self.trash_model:
            try:
                trash_results = self.trash_model.track(
                    frame, 
                    persist=True, 
                    verbose=False, 
                    conf=0.30, 
                    tracker="botsort.yaml"
                )
                if trash_results and trash_results[0].boxes.id is not None:
                    t_boxes = trash_results[0].boxes.xyxy.cpu().numpy()
                    t_track_ids = trash_results[0].boxes.id.int().cpu().tolist()
                    t_classes = trash_results[0].boxes.cls.int().cpu().tolist()

                    for box, track_id, cls in zip(t_boxes, t_track_ids, t_classes):
                        c_name = str(self.trash_model.names.get(cls, cls)).lower()
                        # Evitar duplicar si el modelo de basura tambien tuviese personas o vehiculos
                        if 'person' in c_name or 'car' in c_name:
                            continue

                        # Filtro de supresión: si la detección cae sobre la ropa/torso de una persona, ignorar
                        if self._is_person_clothing_noise(box, persons):
                            continue

                        trash_id = track_id + 50000
                        trashes[trash_id] = box
                        x1, y1, x2, y2 = map(int, box)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                        cv2.putText(frame, "Bolsa de Basura", (x1, max(15, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            except Exception as e:
                pass

        # -----------------------------------------------------------------
        # 3. MÁQUINA DE ESTADOS ESPACIOTEMPORAL (ABANDONO DE 10 SEGUNDOS)
        # -----------------------------------------------------------------
        events = self.state_machine.update(persons, trashes)

        # Si hay eventos confirmados de abandono, guardar en la Base de Datos
        if events:
            for event in events:
                # Todos los eventos devueltos por update() son de abandono
                print(f"[AI ENGINE] INFRACCION DETECTADA: Abandono de basura (Track {event.get('trash_id', 'N/A')})")
                threading.Thread(
                    target=self._run_in_context,
                    args=(self._save_incident_to_db, frame.copy(), event)
                ).start()

        return frame

    def _run_in_context(self, func, *args):
        with self.app_context():
            func(*args)

    def _save_incident_to_db(self, frame, event):
        try:
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

            # Nombres de archivos
            photo_filename = f"evidencia_{timestamp}.jpg"
            video_filename = f"clip_{timestamp}.mp4"

            photo_path = os.path.join(self.evidence_dir, photo_filename)
            video_path = os.path.join(self.evidence_dir, video_filename)

            # Guardar foto en disco
            cv2.imwrite(photo_path, frame)

            # Guardar video compatible con navegadores web (H.264)
            vid_bytes = None
            if self.video_buffer and len(self.video_buffer) > 0:
                raw_video_path = os.path.join(self.evidence_dir, f"raw_{timestamp}.mp4")
                h, w, _ = self.video_buffer[0].shape
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                out = cv2.VideoWriter(raw_video_path, fourcc, 20.0, (w, h))
                for f in list(self.video_buffer):
                    out.write(f)
                out.release()

                # Convertir a H.264 usando ffmpeg para reproducción nativa en navegadores
                try:
                    cmd = ['ffmpeg', '-y', '-i', raw_video_path, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video_path]
                    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                    if os.path.exists(raw_video_path):
                        os.remove(raw_video_path)
                except Exception as ff_err:
                    print(f"[AI ENGINE] Advertencia: ffmpeg no pudo convertir, usando original: {ff_err}")
                    video_path = raw_video_path

                if os.path.exists(video_path):
                    with open(video_path, 'rb') as f:
                        vid_bytes = f.read()

            # Convertir foto a binario para la BD
            _, buffer_img = cv2.imencode('.jpg', frame)
            img_bytes = buffer_img.tobytes()

            # 1. Guardar Notificación (para que aparezca en la bandeja de revisión)
            notif = Notifications(
                type="Bolsas de Basura",
                module="AI_Vision",
                camera="Puente Santa Isabel",
                status="Active",
                conf_score=0.95
            )
            db.session.add(notif)
            db.session.commit()

            # 2. Guardar Detección (Foto)
            det = Detections(
                notification_id=notif.id,
                image_data=img_bytes
            )
            db.session.add(det)

            # 3. Guardar Video (si existe)
            if vid_bytes:
                vid = Videos(
                    notification_id=notif.id,
                    video_data=vid_bytes
                )
                db.session.add(vid)

            db.session.commit()
            print(f"[AI ENGINE] Evidencia registrada en BD y disco: {photo_filename} (Notificación #{notif.id})")

        except Exception as e:
            print(f"[AI ENGINE ERROR] Error al guardar en DB: {e}")
            db.session.rollback()

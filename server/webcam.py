import os
import threading
import time
import cv2

class WebcamCapture:
    def __init__(self):
        env_val = os.getenv("FORESIGHT_WEBCAM_INDEX", "0")
        self.device_index = int(env_val) if env_val.isdigit() else env_val
        self.capture = None
        self.frame = None
        self.lock = threading.Lock()
        self.thread = None
        self.running = False
        self.ai_engine = None

    def start(self):
        if self.running:
            return

        self._open_capture(self.device_index)
        self.running = True
        self.thread = threading.Thread(target=self._read_frames, daemon=True)
        self.thread.start()

    def _open_capture(self, source):
        if self.capture:
            try:
                self.capture.release()
            except Exception:
                pass
            self.capture = None

        if isinstance(source, int):
            self.capture = cv2.VideoCapture(source, cv2.CAP_DSHOW)
            if not self.capture.isOpened():
                self.capture = cv2.VideoCapture(source)
        else:
            self.capture = cv2.VideoCapture(str(source))

        if not self.capture.isOpened():
            raise RuntimeError(f"No se pudo abrir la cámara en la fuente: {source}")

        self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    def _read_frames(self):
        while self.running:
            if self.capture is None or not self.capture.isOpened():
                time.sleep(0.1)
                continue

            success, frame = self.capture.read()
            if success:
                with self.lock:
                    self.frame = frame
            else:
                time.sleep(0.05)

    def change_source(self, new_source):
        """Cambia dinamicamente de camara (0, 1 o URL IP) en tiempo de ejecucion"""
        # Normalizar entrada
        if isinstance(new_source, str) and new_source.strip().isdigit():
            target_source = int(new_source.strip())
        elif isinstance(new_source, str):
            target_source = new_source.strip()
        else:
            target_source = int(new_source)

        print(f"[WEBCAM] Cambiando fuente de cámara de {self.device_index} a {target_source}...")

        # Detener lectura actual
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)

        with self.lock:
            self.frame = None

        # Intentar conectar a la nueva fuente
        try:
            self._open_capture(target_source)
            self.device_index = target_source
            self.running = True
            self.thread = threading.Thread(target=self._read_frames, daemon=True)
            self.thread.start()
            print(f"[WEBCAM] ¡Éxito! Cámara cambiada a: {target_source}")
            return True, f"Cámara cambiada a: {target_source}"
        except Exception as e:
            print(f"[WEBCAM ERROR] Error al conectar a {target_source}: {e}")
            # Intentar volver a la fuente anterior si es posible
            try:
                self._open_capture(self.device_index)
                self.running = True
                self.thread = threading.Thread(target=self._read_frames, daemon=True)
                self.thread.start()
            except Exception:
                pass
            return False, str(e)

    def get_available_sources(self):
        """Escanea camaras locales (0, 1, 2) disponibles"""
        available = []
        for i in range(3):
            try:
                cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
                if cap.isOpened():
                    available.append(i)
                    cap.release()
            except Exception:
                pass
        return available

    def isOpened(self):
        try:
            self.start()
            return True
        except RuntimeError:
            return False

    def read(self):
        self.start()
        while self.running:
            with self.lock:
                frame = None if self.frame is None else self.frame.copy()
            if frame is not None:
                return True, frame
            time.sleep(0.05)
        return False, None

    def frames(self):
        self.start()
        while True:
            with self.lock:
                frame = None if self.frame is None else self.frame.copy()

            if frame is None:
                time.sleep(0.05)
                continue

            # Inyectar el procesamiento IA aqui
            if getattr(self, 'ai_engine', None) is not None:
                frame = self.ai_engine.process_frame(frame)

            success, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if success:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n"
                    + encoded.tobytes()
                    + b"\r\n"
                )

webcam = WebcamCapture()

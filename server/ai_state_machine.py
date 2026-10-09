import time
import math
import cv2
import numpy as np

class TrashState:
    def __init__(self, track_id, bbox):
        self.track_id = track_id
        self.bbox = bbox
        self.state = "HELD" 
        self.last_person_id = None
        self.drop_time = None
        

def calculate_distance(box1, box2):
    x1_c = (box1[0] + box1[2]) / 2
    y1_c = (box1[1] + box1[3]) / 2
    x2_c = (box2[0] + box2[2]) / 2
    y2_c = (box2[1] + box2[3]) / 2
    return math.sqrt((x2_c - x1_c)**2 + (y2_c - y1_c)**2)

def is_held_by_person(trash_box, person_box, threshold=200):
    # 1. Chequeamos si se superponen (Overlap). Si la caja de la mochila choca con la de la persona.
    x_left = max(trash_box[0], person_box[0])
    y_top = max(trash_box[1], person_box[1])
    x_right = min(trash_box[2], person_box[2])
    y_bottom = min(trash_box[3], person_box[3])
    
    if x_right > x_left and y_bottom > y_top:
        return True # Se tocan
        
    # 2. Si no se tocan pero estan muy cerca en pixeles (por el angulo de la camara)
    dist = calculate_distance(trash_box, person_box)
    if dist < threshold:
        return True
        
    return False

class StateMachine:
    def __init__(self, abandonment_time=5.0, distance_threshold=150):
        self.abandonment_time = abandonment_time
        self.distance_threshold = distance_threshold
        self.tracked_trash = {} 
        self.abandoned_reported = set() 
        self.reported_spatial_memory = [] # Lista de (x, y) físicos ya reportados
        
        # ZONA DE INTERÉS (ROI): Solo se detecta abandono dentro de este polígono.
        # Por defecto, analizamos todo el cuadro. 
        # Pero si configuras un polígono, ignorará arrojos fuera del puente.
        self.roi_polygon = None 

    def is_in_roi(self, bbox):
        if self.roi_polygon is None: return True
        x_c = (bbox[0] + bbox[2]) / 2
        y_c = (bbox[1] + bbox[3]) / 2
        return cv2.pointPolygonTest(self.roi_polygon, (x_c, y_c), False) >= 0

    def update(self, persons, trashes):
        events_triggered = []
        current_time = time.time()
        
        for t_id, t_bbox in trashes.items():
            t_xc = (t_bbox[0] + t_bbox[2]) / 2
            t_yc = (t_bbox[1] + t_bbox[3]) / 2

            if t_id not in self.tracked_trash:
                # Comprobar si ya existe basura reportada en ese mismo lugar físico (evitar duplicados por parpadeo de cámara)
                is_already_reported = False
                for rx, ry in self.reported_spatial_memory:
                    dist = math.sqrt((t_xc - rx)**2 + (t_yc - ry)**2)
                    if dist < 80: # Tolerancia de 80 píxeles
                        is_already_reported = True
                        break

                self.tracked_trash[t_id] = TrashState(t_id, t_bbox)
                
                # Si es la misma basura de siempre (solo cambió su ID), silenciarla
                if is_already_reported:
                    self.abandoned_reported.add(t_id)
                    self.tracked_trash[t_id].state = "ABANDONED"
            else:
                self.tracked_trash[t_id].bbox = t_bbox
                
            trash_obj = self.tracked_trash[t_id]
            
            # Buscar si alguna persona lo esta sosteniendo
            is_held = False
            held_by_id = None
            for p_id, p_bbox in persons.items():
                if is_held_by_person(t_bbox, p_bbox, self.distance_threshold):
                    is_held = True
                    held_by_id = p_id
                    break
            
            # Lógica
            if is_held:
                trash_obj.state = "HELD"
                trash_obj.last_person_id = held_by_id
                trash_obj.drop_time = None 
            else:
                if trash_obj.state == "HELD":
                    trash_obj.state = "DROPPED"
                    trash_obj.drop_time = current_time
                
                # Reportar abandono solo si pasó el tiempo y ESTÁ dentro del polígono
                if trash_obj.state == "DROPPED" and trash_obj.drop_time is not None:
                    elapsed = current_time - trash_obj.drop_time
                    if elapsed > self.abandonment_time and t_id not in self.abandoned_reported:
                        if self.is_in_roi(t_bbox):
                            trash_obj.state = "ABANDONED"
                            self.abandoned_reported.add(t_id)
                            
                            # Guardar la ubicación física en la memoria para que no vuelva a sonar nunca más, 
                            # incluso si la cámara parpadea y le asigna un nuevo ID.
                            r_xc = (t_bbox[0] + t_bbox[2]) / 2
                            r_yc = (t_bbox[1] + t_bbox[3]) / 2
                            self.reported_spatial_memory.append((r_xc, r_yc))
                            
                            events_triggered.append({
                                'trash_id': t_id,
                                'trash_bbox': t_bbox,
                                'person_id': trash_obj.last_person_id,
                                'elapsed_time': elapsed
                            })
                        
        return events_triggered

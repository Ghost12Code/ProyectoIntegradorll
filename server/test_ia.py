import cv2
from ultralytics import YOLO

def main():
    print("⏳ Cargando modelo base de Personas...")
    model_personas = YOLO('yolov8n.pt')
    
    print("⏳ Cargando TU NUEVO modelo de Basura (best.pt)...")
    try:
        model_basura = YOLO('best.pt')
    except Exception as e:
        print(f"❌ Error al cargar best.pt. Asegúrate de que esté en la misma carpeta: {e}")
        return

    print("✅ Modelos cargados. Encendiendo cámara...")
    # Cambia el 0 por 1 si usas cámara externa
    cap = cv2.VideoCapture(0)

    print("\n===========================================")
    print("👁️  CÁMARA ENCENDIDA - PRUEBA EN VIVO")
    print("👉 Presiona la tecla 'q' para cerrar la ventana.")
    print("===========================================\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("No se pudo leer la cámara.")
            break

        # 1. Detectar Personas (Usando el modelo general YOLOv8n)
        resultados_personas = model_personas(frame, classes=[0], verbose=False)
        for r in resultados_personas:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                # Dibujar caja verde para personas
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(frame, "Persona", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        # 2. Detectar Basura (Usando tu modelo best.pt)
        # conf=0.30 es la sensibilidad (30% de seguridad mínimo)
        resultados_basura = model_basura(frame, conf=0.30, verbose=False)
        for r in resultados_basura:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                # Obtener el nombre de la etiqueta que le pusiste en Roboflow
                nombre_clase = model_basura.names[int(box.cls[0])]
                
                # Dibujar caja roja para la basura
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                cv2.putText(frame, f"{nombre_clase}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        # Mostrar el video en una ventana emergente
        cv2.imshow("Prueba de IA - Rayos X", frame)

        # Si se presiona la tecla 'q', se rompe el ciclo
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Limpiar y cerrar todo
    cap.release()
    cv2.destroyAllWindows()
    print("✅ Prueba finalizada.")

if __name__ == '__main__':
    main()

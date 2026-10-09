import os
from roboflow import Roboflow
from ultralytics import YOLO

# ==========================================
# 1. PEGA TUS CREDENCIALES DE ROBOFLOW AQUÍ
# ==========================================
# Estas credenciales las obtienes en Roboflow al dar clic en 
# "Export Dataset" -> Formato "YOLOv8" -> "Show download code"

API_KEY = "Mk4aSvclv97CxPO5EKTL"
WORKSPACE = "aldair-vjqwp"
PROJECT = "trash-and-person-sytny"
VERSION = 1

def main():
    print("--- 1. Descargando Dataset desde Roboflow ---")
    try:
        rf = Roboflow(api_key=API_KEY)
        project = rf.workspace(WORKSPACE).project(PROJECT)
        version = project.version(VERSION)
        
        # Descarga el dataset en formato YOLOv8
        dataset = version.download("yolov8")
        print(f"\n[OK] Dataset descargado exitosamente en: {dataset.location}")
    except Exception as e:
        print(f"\n[ERROR] No se pudo descargar el dataset. Revisa tu API_KEY y nombres de proyecto: {e}")
        return

    print("\n--- 2. Iniciando Entrenamiento con YOLOv8 ---")
    # Cargamos el "cerebro" base (YOLOv8n - ligero y rápido)
    model = YOLO('yolov8n.pt')

    # Ruta del archivo de configuración que descargó Roboflow
    yaml_path = os.path.join(dataset.location, "data.yaml")

    # Comenzamos a entrenar
    results = model.train(
        data=yaml_path,
        epochs=30,           # Cantidad de veces que estudiará las fotos (Súbelo a 50 si tienes tiempo)
        imgsz=640,           # Tamaño de las imágenes
        batch=16,            # Imágenes procesadas por lote
        name='bolsas_basura' # Nombre de la carpeta donde se guardará el modelo
    )

    print("\n=======================================================")
    print("--- 3. ¡Entrenamiento Terminado! ---")
    print("El archivo entrenado ha sido generado con éxito.")
    print("Busca tu nuevo archivo en la siguiente ruta:")
    print("👉 runs/detect/bolsas_basura/weights/best.pt 👈")
    print("Copia ese 'best.pt' a la carpeta principal de tu server y reemplaza el anterior.")
    print("=======================================================")

if __name__ == '__main__':
    main()

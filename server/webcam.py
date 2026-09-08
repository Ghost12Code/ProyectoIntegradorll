import os
import threading
import time

import cv2


class WebcamCapture:
    def __init__(self):
        self.device_index = int(os.getenv("FORESIGHT_WEBCAM_INDEX", "0"))
        self.capture = None
        self.frame = None
        self.lock = threading.Lock()
        self.thread = None
        self.running = False

    def start(self):
        if self.running:
            return

        self.capture = cv2.VideoCapture(self.device_index, cv2.CAP_DSHOW)
        if not self.capture.isOpened():
            self.capture.release()
            self.capture = cv2.VideoCapture(self.device_index)

        if not self.capture.isOpened():
            raise RuntimeError(
                f"No se pudo abrir la webcam en el indice {self.device_index}"
            )

        self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.running = True
        self.thread = threading.Thread(target=self._read_frames, daemon=True)
        self.thread.start()

    def _read_frames(self):
        while self.running:
            success, frame = self.capture.read()
            if success:
                with self.lock:
                    self.frame = frame
            else:
                time.sleep(0.05)

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

    def get(self, property_id):
        if property_id == cv2.CAP_PROP_FPS:
            return 30
        return 0

    def set(self, _property_id, _value):
        return False

    def release(self):
        pass

    def frames(self):
        self.start()
        while True:
            with self.lock:
                frame = None if self.frame is None else self.frame.copy()

            if frame is None:
                time.sleep(0.05)
                continue

            success, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            if success:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n"
                    + encoded.tobytes()
                    + b"\r\n"
                )


webcam = WebcamCapture()

import json
import time
from flask import Flask, Response, jsonify
from flask_cors import CORS
import logging
import requests
from threading import Thread

#Handel token releated operations
from endpoints.auth.helpers import revoke_token, is_token_revoked

# Importing the rest_api from routes.py
from endpoints import Foresight_API
# Importing the extensions
from extensions import db, jwt
from models import Roles
from models.camera import CameraDetails
from webcam import webcam

# Creating the Flask app instance
app = Flask(__name__)

# Loading configuration from BaseConfig class in the config module
app.config.from_object('config.BaseConfig')



# Initializing the database with the app instance
db.init_app(app)

# Initializing the rest_api with the app instance
Foresight_API.init_app(app)


# Initializing the JWTManager extension with the app instance
jwt.init_app(app)

# Enabling Cross-Origin Resource Sharing (CORS)
CORS(app)


@app.route('/local-camera/feed')
def local_camera_feed():
    try:
        return Response(
            webcam.frames(),
            mimetype='multipart/x-mixed-replace; boundary=frame'
        )
    except RuntimeError as error:
        return jsonify({"success": False, "msg": str(error)}), 503

#Initialize boolean
initialized = False

# Global variable to store RTSP URLs
#rtsp_urls = []

# Assuming CameraDetails model and rtsp_urls variable as previously defined

# def process_stream(rtsp_url):
#     try:
#         response = requests.post('http://localhost:5000/api/users/process_weapon', json={'rtsp_url': rtsp_url})
#         print(f"Response for {rtsp_url}: {response.status_code}")
#     except Exception as e:
#         print(f"Error processing stream {rtsp_url}: {e}")

# def construct_and_send_rtsp_urls():
#     global rtsp_urls
#     try:
#         cameras = CameraDetails.query.all()
#         with ThreadPoolExecutor(max_workers=len(cameras)) as executor:
#             for camera in cameras:
#                 portactive = ":" + camera.Port if camera.Port else ""
#                 rtsp_url = f"rtsp://{camera.IPAddress}{portactive}/{camera.Option}"
#                 rtsp_urls.append(rtsp_url)
#                 executor.submit(process_stream, rtsp_url)
#         print("RTSP URLs processing initiated.")
#     except Exception as e:
#         print(f"Error during RTSP URL processing: {e}")

# @app.before_request
# def startup():
#     construct_and_send_rtsp_urls()

currently_processing = set()


def build_rtsp_url(camera):
    if camera.IPAddress.lower() in {'usb', 'local', 'webcam'}:
        return f'usb://{camera.Option or "0"}'

    rtsp_base = f"rtsp://{camera.IPAddress}"
    rtsp_port = f":{camera.Port}" if camera.Port else ""
    rtsp_option = f"/{camera.Option}" if camera.Option else ""
    return rtsp_base + rtsp_port + rtsp_option

def build_processing_url(camera):
    if camera.IPAddress.lower() in {'usb', 'local', 'webcam'}:
        return build_rtsp_url(camera)

    # Read from RTSPtoWeb's local proxy so Flask does not open the phone stream twice.
    return f"rtsp://127.0.0.1:5541/{camera.id}/0"

def call_process_weapon(rtsp_url):
    # The process_weapon endpoint expects a POST request with the RTSP URL
    endpoint = 'http://localhost:5000/user/api/process_weapon'  # Update with your actual endpoint
    try:
        response = requests.post(endpoint, json={'rtsp_url': rtsp_url}, timeout=(5, None))
        print(f"Weapon processing response for {rtsp_url}: {response.status_code} {response.text}")
    except requests.RequestException as error:
        print(f"Weapon processing request failed for {rtsp_url}: {error}")

def call_process_fire(rtsp_url):
    # The process_fire endpoint expects a POST request with the RTSP URL
    endpoint = 'http://localhost:5000/user/api/process_fire'  # Update with your actual endpoint
    try:
        response = requests.post(endpoint, json={'rtsp_url': rtsp_url}, timeout=(5, None))
        print(f"Fire processing response for {rtsp_url}: {response.status_code} {response.text}")
    except requests.RequestException as error:
        print(f"Fire processing request failed for {rtsp_url}: {error}")

def process_camera(camera_id, processing_url):
    fire_thread = Thread(target=call_process_fire, args=(processing_url,))
    weapon_thread = Thread(target=call_process_weapon, args=(processing_url,))
    fire_thread.start()
    weapon_thread.start()
    fire_thread.join()
    weapon_thread.join()
    currently_processing.discard(camera_id)

def initializeProcessing():
    with app.app_context():
        cameras = CameraDetails.query.all()
        CameraDetails.query.session.close()

        for camera in cameras:
            if camera.IPAddress.lower() in {'usb', 'local', 'webcam'}:
                print(f"Skipping local camera {camera.id}; RTSPtoWeb requires a network stream")
                continue

            if camera.id in currently_processing:
                continue

            currently_processing.add(camera.id)
            rtsp_url = build_rtsp_url(camera)
            processing_url = build_processing_url(camera)

            print(f"Streaming camera {camera.id}: {rtsp_url}")
            print(f"Analyzing camera {camera.id} through: {processing_url}")

            processing_thread = Thread(
                target=process_camera,
                args=(camera.id, processing_url),
            )
            processing_thread.start()


# Run initializeProcessing in a background thread
#@app.before_request
def start_initialize_processing():
    print("> Success: Started Image Processing from all cameras")
    processing_thread = Thread(target=initializeProcessing)
    processing_thread.daemon = True  # Daemonize thread
    processing_thread.start()


@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_data):
    try:
        if is_token_revoked(jwt_data):

            # Provide a generic response
            
            print("hit token already revoked")
            return jsonify({"message": "Authentication failed", "error": "token_revoked"}), 401
        else:
            jti = jwt_data["jti"]
            user_id = jwt_data[app.config.get("JWT_IDENTITY_CLAIM")]
            revoke_token(jti,user_id);
            # Provide a generic response
            return jsonify({"message": "Authentication failed", "error": "token_expired"}), 401
    except Exception as e:

        # Provide a generic response
        print("hit exception")
        return jsonify({"message": "Authentication failed", "error": "token_expired"}), 401



@jwt.invalid_token_loader
def invalid_token_callback(error):
        return (
            jsonify(
                {"message": "Signature verification has failed", "error": "invalid_token"}
            ),
            401,
        )

@jwt.unauthorized_loader
def missing_token_callback(error):
        return (
            jsonify(
                {
                    "message": "Request doesnt contain valid token",
                    "error": "authorization_header",
                }
            ),
            401,
        )

# Setup the database prior to the first request

def initialize_database():
    global initialized

    if not initialized:
        try:
            db.create_all()
            print('> Success: All relevant tables have been created')
            initialized = True
        except Exception as e:
            print('> Error: DBMS Table creation exception: ' + str(e))

@app.teardown_appcontext
def teardown_db(exception):
    """Close the database session at the end of each request."""
    db.session.close()


def create_roles():
    roles_data = [
        {'name': 'Administrator', 'slug': 'admin'},
        {'name': 'Normal User', 'slug': 'user'},
        {'name': 'Super Administrator', 'slug': 'super-admin'}
    ]

    for role_data in roles_data:
        role = Roles.query.filter_by(name=role_data['name']).first()
        if not role:
            new_role = Roles(name=role_data['name'], slug=role_data['slug'])
            db.session.add(new_role)

    db.session.commit()
    db.session.close()

# Custom response for debugging
@app.after_request
def after_request(response):
    # Check if the response status code indicates an error (400 or higher)
    if response.status_code >= 400:
        try:
            response_data = json.loads(response.get_data())
            if "errors" in response_data:
                # If "errors" key exists in the response data, transform it
                response_data = {"success": False,
                                 "msg": list(response_data["errors"].items())[0][1]}
                response.set_data(json.dumps(response_data))
            response.headers.add('Content-Type', 'application/json')
        except json.JSONDecodeError as e:
            # If JSON decoding fails, log the error and leave the response unchanged
            logging.error(f"JSON decoding error: {e}")

    return response


with app.app_context():
    # Initialization code that requires app context
   initialize_database()
   create_roles()
   start_initialize_processing()

# This part runs the Flask app if this script is being executed directly
if __name__ == '__main__':
    app.run()
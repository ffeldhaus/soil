import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from app.core.config import settings, ROOT_DIR # Import ROOT_DIR

_firebase_app_initialized = False

def initialize_firebase_app():
    """
    Initializes the Firebase Admin SDK application.

    This function should be called once on application startup.
    It uses the GOOGLE_APPLICATION_CREDENTIALS environment variable
    to find the service account key JSON file.
    """
    global _firebase_app_initialized
    if _firebase_app_initialized:
        # print("Firebase app already initialized.")
        return

    # Check if running in emulator mode
    if os.environ.get('USE_FIREBASE_EMULATOR') == 'true':
        print("USE_FIREBASE_EMULATOR is true. Configuring Firebase Admin SDK to use emulators.")
        os.environ['FIREBASE_AUTH_EMULATOR_HOST'] = os.environ.get('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099')
        os.environ['FIRESTORE_EMULATOR_HOST'] = os.environ.get('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080')
        # For emulators, a project ID is still good practice, but credentials are not strictly needed.
        # The SDK will automatically connect to emulators if the above env vars are set.
        try:
            gcp_project_id = settings.GCP_PROJECT_ID or "local-emulator-project"
            firebase_admin.initialize_app(options={
                'projectId': gcp_project_id,
            })
            _firebase_app_initialized = True
            print(f"Firebase Admin SDK initialized for emulators with project ID: {gcp_project_id}.")
            return
        except Exception as e:
            print(f"Error initializing Firebase Admin SDK for emulators: {e}")
            # Potentially raise or handle as critical
            raise

    # Original initialization path (non-emulator)
    try:
        cred_path = settings.GOOGLE_APPLICATION_CREDENTIALS
        gcp_project_id = settings.GCP_PROJECT_ID

        if not cred_path:
            print("GOOGLE_APPLICATION_CREDENTIALS not set. Firebase Admin SDK will try to use default credentials (e.g., from gcloud or Compute Engine metadata).")
            # Attempt to initialize without explicit credentials (relies on environment)
            # This path might still be used if emulators are not explicitly enabled but no creds are found.
            firebase_admin.initialize_app(options={
                'projectId': gcp_project_id,
            } if gcp_project_id else None)
            _firebase_app_initialized = True
            print("Firebase Admin SDK initialized using application default credentials.")
            return

        # Resolve the path if it's relative
        if not os.path.isabs(cred_path):
            # Assuming cred_path is relative to the backend project root
            resolved_cred_path = os.path.join(ROOT_DIR, cred_path)
            print(f"Resolved GOOGLE_APPLICATION_CREDENTIALS path to: {resolved_cred_path}")
        else:
            resolved_cred_path = cred_path
            print(f"Using absolute GOOGLE_APPLICATION_CREDENTIALS path: {resolved_cred_path}")


        if not os.path.exists(resolved_cred_path):
            raise FileNotFoundError(
                f"Firebase service account key file not found at: {resolved_cred_path}. "
                "Ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly."
            )

        cred = credentials.Certificate(resolved_cred_path)
        
        firebase_options = {'credential': cred}
        if gcp_project_id:
            firebase_options['projectId'] = gcp_project_id
            # You can also specify databaseURL and storageBucket if needed,
            # though often not required for Admin SDK's Firestore/Auth usage.
            # firebase_options['databaseURL'] = f"https://{gcp_project_id}.firebaseio.com"
            # firebase_options['storageBucket'] = f"{gcp_project_id}.appspot.com"
        
        firebase_admin.initialize_app(credential=cred, options=firebase_options)
        _firebase_app_initialized = True
        print(f"Firebase Admin SDK initialized successfully for project: {gcp_project_id or 'derived from credentials'}.")

    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
        # Depending on your error handling strategy, you might want to re-raise the exception
        # or exit the application if Firebase is critical.
        # raise

def get_firestore_client():
    """
    Returns an instance of the Firestore client.
    Ensures Firebase app is initialized before returning the client.
    """
    if not _firebase_app_initialized:
        initialize_firebase_app() # Ensure initialization
        if not _firebase_app_initialized: # Check again after attempt
             raise RuntimeError("Firebase app could not be initialized. Firestore client unavailable.")
    return firestore.client()

def get_firebase_auth():
    """
    Returns an instance of the Firebase Auth service.
    Ensures Firebase app is initialized before returning the auth service.
    """
    if not _firebase_app_initialized:
        initialize_firebase_app() # Ensure initialization
        if not _firebase_app_initialized: # Check again after attempt
            raise RuntimeError("Firebase app could not be initialized. Firebase Auth unavailable.")
    return auth

# Optional: function to explicitly close/delete the app if needed during testing or complex shutdown
# def close_firebase_app():
#     """
#     Deletes the default Firebase app.
#     Useful for cleanup in tests or specific shutdown scenarios.
#     """
#     global _firebase_app_initialized
#     if _firebase_app_initialized:
#         try:
#             firebase_admin.delete_app(firebase_admin.get_app())
#             _firebase_app_initialized = False
#             print("Firebase app deleted.")
#         except Exception as e:
#             print(f"Error deleting Firebase app: {e}")
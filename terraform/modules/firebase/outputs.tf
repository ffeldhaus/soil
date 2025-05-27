output "web_app_id" { value = google_firebase_web_app.default.app_id }
output "api_key" { value = data.google_firebase_web_app_config.default.api_key }
output "auth_domain" { value = data.google_firebase_web_app_config.default.auth_domain }
output "project_id" { value = data.google_firebase_web_app_config.default.project_id }
output "storage_bucket" { value = data.google_firebase_web_app_config.default.storage_bucket }
output "messaging_sender_id" { value = data.google_firebase_web_app_config.default.messaging_sender_id }
output "app_id" { value = data.google_firebase_web_app_config.default.app_id }
output "measurement_id" { value = data.google_firebase_web_app_config.default.measurement_id }

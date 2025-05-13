output "load_balancer_ip_address" {
  description = "The external IP address of the Load Balancer."
  value       = google_compute_global_address.ip_address.address
}

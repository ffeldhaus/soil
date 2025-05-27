variable "project_id" { type = string }
variable "bucket_name" { type = string }
variable "location" { type = string }
variable "public" {
  description = "Make bucket contents publicly readable (for static website hosting)."
  type        = bool
  default     = true
}
variable "website_config" {
  description = "Configure the bucket for static website hosting."
  type = object({
    main_page_suffix = string
    not_found_page   = string
  })
  default = {
    main_page_suffix = "index.html"
    not_found_page   = "index.html" # Often the same for SPAs
  }
}

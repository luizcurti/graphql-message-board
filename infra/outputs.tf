output "app_url" {
  description = "The app (SPA) over HTTPS; the GraphQL API is at <app_url>/graphql."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "graphql_url" {
  value = "https://${aws_cloudfront_distribution.main.domain_name}/graphql"
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.bucket
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service" {
  value = aws_ecs_service.backend.name
}

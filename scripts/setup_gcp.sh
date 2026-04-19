#!/bin/bash
# Run this in Google Cloud Shell: https://shell.cloud.google.com
# This sets up all GCP prerequisites for MatchBuddy in one shot
set -e

PROJECT_ID=$(gcloud config get-value project)
echo "Setting up MatchBuddy on project: $PROJECT_ID"

# Enable required APIs
echo "Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com

# Create Artifact Registry repo
echo "Creating Artifact Registry..."
gcloud artifacts repositories create matchbuddy \
  --repository-format=docker \
  --location=asia-south1 \
  --description="MatchBuddy container" 2>/dev/null || echo "Registry already exists, skipping."

# Create service account for GitHub Actions
echo "Creating service account..."
gcloud iam service-accounts create matchbuddy-github \
  --display-name="MatchBuddy GitHub Actions" 2>/dev/null || echo "Service account exists."

SA_EMAIL="matchbuddy-github@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant required roles
echo "Granting IAM roles..."
for ROLE in \
  roles/run.admin \
  roles/artifactregistry.writer \
  roles/storage.admin \
  roles/iam.serviceAccountUser \
  roles/cloudbuild.builds.editor; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$ROLE" --quiet
done

# Generate and download key
echo "Generating service account key..."
gcloud iam service-accounts keys create /tmp/matchbuddy-sa-key.json \
  --iam-account=$SA_EMAIL

echo ""
echo "=============================================="
echo "SETUP COMPLETE"
echo "Your GCP_PROJECT_ID is: $PROJECT_ID"
echo ""
echo "Copy the JSON below and paste as GCP_SA_KEY secret in GitHub:"
echo "=============================================="
cat /tmp/matchbuddy-sa-key.json

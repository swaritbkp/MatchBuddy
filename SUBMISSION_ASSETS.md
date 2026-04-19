# Hackathon Submission Assets

## 4.1 Project Title
MatchBuddy — Stadium Safety & Mobility OS

## 4.2 One-Liner
Your guardian in the crowd: an AI-powered safety and mobility OS for mega-events.

## 4.3 Project Description
MatchBuddy is a Stadium Safety and Mobility OS designed for mega-events like the IPL and Kumbh Mela. It solves crowd chaos by giving every fan a unified toolkit: SOS+ triggers instant emergency alerts to security, FindMyRide uses multimodal AI to analyze parking photos and Google Maps to route fans back to their vehicles, Crowd Exit Intelligence provides live density updates for the safest gate, and MeetPoint sets temporary rendezvous pins for separated families. 

Built as an installable PWA for offline resilience, it leverages a FastAPI backend scaled on Cloud Run. It uses Gemini 2.0 Flash for instant SOS triage and zero-shot photo zone labeling, while Firebase Realtime DB and Cloud Messaging handle live incident tracking and push notifications. Google Maps Directions API guarantees optimal exit routing.

9 Google services. One app. One tap.

## 4.4 Google Services Used
| Service | Specific Usage |
|---------|----------------|
| **Gemini 2.0 Flash (Text)** | Generates real-time, context-aware SOS triage instructions for fans and security based on emergency type and GPS data. |
| **Gemini 2.0 Flash (Vision)** | Analyzes user-uploaded parking photos to automatically extract and label specific zone, pillar, and level details. |
| **Google Maps Directions API** | Calculates live walk and drive times across all stadium gates to provide fans with the mathematically fastest exit route. |
| **Google Maps JS API** | Renders the interactive map overlays and visual routing for the MeetPoint and FindMyRide features. |
| **Firebase Realtime Database** | Syncs live SOS alerts, crowd density updates, and temporary MeetPoints instantly to the admin dashboard and nearby fans. |
| **Firebase Cloud Messaging** | Dispatches immediate push notifications to family members and security personnel when an SOS is triggered. |
| **Firebase Storage** | Securely stores and serves compressed parking lot photos uploaded by fans. |
| **Google Cloud Run** | Hosts the containerized FastAPI backend, scaling automatically to handle massive traffic spikes during stadium exits. |
| **Google Artifact Registry** | Stores securely the multi-stage Docker images used by Cloud Run for rapid and consistent deployments. |

## 4.5 LinkedIn Post
We just built MatchBuddy — a Stadium Safety & Mobility OS for IPL-scale crowds! 🏟️ Proud to submit this to the @GoogleForDevelopers hackathon. It combines Gemini 2.0 Flash for instant SOS triage, Firebase for real-time incident tracking, and Google Maps API for exit routing, all scaled on Cloud Run. 🚀 The entire codebase is open-source on GitHub — check it out and let us know your thoughts!

## 4.6 Elevator Pitch
Imagine 50,000 people leaving a stadium. Medical emergencies get lost in the noise, parking lots turn into chaos, and families separate. MatchBuddy is an AI-powered Stadium Safety OS that fixes this. With one tap, Gemini 2.0 Flash triages SOS alerts while Firebase alerts security. Fans snap a photo of their car, and Gemini Vision extracts the zone so Google Maps can guide them back. Fast, scalable, and resilient. 9 Google services. One app. One tap.

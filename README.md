# ResearchAI — ENSIA Research Collaboration Platform

> **Connect with ENSIA researchers, discover cutting-edge papers, and publish your work — supercharged by AI.**

![TypeScript](https://img.shields.io/badge/TypeScript-97.8%25-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React%20+%20Vite-61DAFB?style=flat&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20+%20Express-339933?style=flat&logo=node.js&logoColor=white)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![Python](https://img.shields.io/badge/AI%20Services-Python%20Flask-3776AB?style=flat&logo=python&logoColor=white)

---

## Table of Contents

1. [About the Project](#about-the-project)
2. [Platform Statistics](#platform-statistics)
3. [Architecture Overview](#architecture-overview)
4. [Pages & Features](#pages--features)
   - [Home / Landing Page](#1-home--landing-page)
   - [Sign Up (CV-Powered Onboarding)](#2-sign-up--cv-powered-onboarding)
   - [Login](#3-login)
   - [Explore Feed](#4-explore-feed)
   - [Search](#5-search)
   - [Projects](#6-projects)
   - [Project Detail](#7-project-detail)
   - [Create Project](#8-create-project)
   - [Profile (My Profile)](#9-profile-my-profile)
   - [Public Person Profile](#10-public-person-profile)
   - [My Posts](#11-my-posts)
   - [Create Post / Submit](#12-create-post--submit)
   - [Applications](#13-applications)
   - [AMS — Application Management System](#14-ams--application-management-system)
   - [AI Ranking](#15-ai-ranking)
   - [Teams](#16-teams)
   - [Team Detail](#17-team-detail)
   - [About](#18-about)
5. [AI Services](#ai-services)
   - [CV Extractor Service](#cv-extractor-service-port-5001)
   - [Student Ranking Service](#student-ranking-service-port-8000)
6. [Backend API Reference](#backend-api-reference)
7. [Database Models](#database-models)
8. [Tech Stack](#tech-stack)
9. [Project Structure](#project-structure)
10. [Getting Started](#getting-started)
11. [Environment Variables](#environment-variables)
12. [Contributing](#contributing)

---

## About the Project

**ResearchAI** is a full-stack research collaboration platform built for ENSIA (École Nationale Supérieure d'Informatique). It bridges the gap between researchers and students by providing a space to discover projects, publish recruitment & discussion posts, manage applications, and find collaborators — all enhanced by AI.

The platform is built around **two user roles**:

| Role | Capabilities |
|------|-------------|
| **Researcher** | Create & manage projects, publish recruitment/discussion posts, review applications, run AI-powered applicant ranking |
| **Student** | Browse projects, discover posts, apply to open positions, build a profile from their CV |

---

## Platform Statistics

| Metric | Value |
|--------|-------|
| 👩‍🔬 Researchers | 1,200+ |
| 📄 Published Papers | 340+ |
| 🚀 Active Projects | 95+ |
| 🧪 Research Domains | 18 |

---

## Architecture Overview

The system is composed of **three independently running services** plus the React frontend:

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                     │
│              Vite · React · TypeScript · port 5173          │
└──────────────────┬─────────────────────┬────────────────────┘
                   │                     │
                   ▼                     ▼
   ┌───────────────────────┐   ┌──────────────────────────┐
   │   Node.js Backend API  │   │   CV Extractor Service   │
   │  Express + Prisma      │   │   Flask + Groq/Llama     │
   │  MySQL · port 5000     │   │   Tesseract OCR · 5001   │
   └───────────────────────┘   └──────────────────────────┘
                   │
                   ▼
   ┌───────────────────────┐
   │  AI Ranking Service   │
   │  Flask · port 8000    │
   └───────────────────────┘
```

**Data flow summary:**
- The frontend talks to the **Node.js backend** for all CRUD operations (projects, posts, users, applications).
- During **Sign Up**, the frontend sends the uploaded CV to the **CV Extractor** (port 5001), which uses OCR + Groq/Llama to parse skills, experience, and education. The result is pre-filled into the registration form.
- On the **Ranking page**, researchers send weighted skill criteria and a list of applicants to the **AI Ranking Service** (port 8000), which returns a sorted leaderboard.

---

## Pages & Features

### 1. Home / Landing Page
**Route:** `/`

The public-facing entry point of the platform. It serves as the showcase and call-to-action for new visitors.

**What's on this page:**
- **Animated Hero Section** — A full-viewport hero with floating math/code symbols (animated with Framer Motion) and the main tagline: *"The platform to research."*
- **CTA Buttons** — "Get started free" (→ `/signup`) and "Explore research."
- **Stats Bar** — A dark navy strip displaying live platform statistics: 1,200+ Researchers, 340+ Papers, 95+ Projects, 18 Domains.
- **Features Section** — Three feature cards explaining the platform's key AI capabilities:
  - `01` AI-Powered Matching
  - `02` Semantic Paper Search
  - `03` Collaborative Workspaces
- **Floating AI Chat Widget** — A chat bubble (bottom-right corner) available on all pages. Clicking it opens an AI assistant panel that answers research-related questions and suggests relevant labs/projects.

---

### 2. Sign Up — CV-Powered Onboarding
**Route:** `/signup`

A multi-step registration wizard that uses AI to auto-fill your profile from your CV.

**Step-by-step flow:**

```
Step 1: Choose Role
    → Student or Researcher

Step 2: Upload CV
    → Drag & drop or file picker (PDF)
    → CV is sent to CV Extractor Service (port 5001)

Step 3: Extracting...
    → Visual loading screen while the AI reads the CV
    → Groq/Llama LLM extracts: name, skills, education, experience, research areas

Step 4: Review & Edit
    → Pre-filled form with all extracted data
    → User can add/remove tags, skills, edit any field
    → Additional fields: GPA (students), institution, bio

Step 5: Done ✓
    → Account created, redirect to login
```

**Why this matters:** Students and researchers don't have to manually fill in their skills and background — the AI does it from their CV automatically.

---

### 3. Login
**Route:** `/login`

Standard login page with email and password. On success, a JWT access token and refresh token are stored, and the user is redirected to the platform. Role detection (`student` / `researcher`) happens at login and controls what navigation links and pages are visible.

---

### 4. Explore Feed
**Route:** `/explore`
**Auth required:** Yes

The main activity feed of the platform — like a LinkedIn feed, but for research. Users see all open recruitment and discussion posts from across the platform.

**What's on this page:**
- **Feed of Posts** — Each card shows post title, type badge (📢 Recruitment or 💬 Discussion), project name, creator, status, deadline, topic tags, required skills, and time posted.
- **Filters** — Filter by post type, status (open / closed / filled), and collaboration type.
- **Search bar** — Instant keyword search across post titles and descriptions.
- **Apply button** — Opens an application modal directly in-feed without navigating away.
- **"+ New Post" button** (researchers only) — Links to the Create Post page.

---

### 5. Search
**Route:** `/search`
**Auth required:** Yes

A unified search page that lets users search across all content types at once.

**Search modes (tabs):**
- **All** — Returns posts and people combined
- **Posts** — Recruitment and discussion posts only
- **Researchers** — Researcher profiles only
- **Students** — Student profiles only

**How it works:** Typing in the search bar performs a live, client-side filter. Each result card links to the relevant profile (`/people/:role/:id`) or post. AI-recommended results are flagged with a ⭐ star icon.

---

### 6. Projects
**Route:** `/projects`
**Auth required:** Yes

Shows all projects the current user is part of (as researcher or student member).

**What's on this page:**
- **Project cards** — Title, status badge (draft / open / closed / archived), description excerpt, creation date.
- **Status filter tabs** — All / Draft / Open / Closed / Archived.
- **Create Project button** (researchers only) — Links to `/create-project`.
- **Edit / Delete actions** — Researchers who own a project can manage it directly from the list.

---

### 7. Project Detail
**Route:** `/projects/:id`
**Auth required:** Yes

A full breakdown of a single research project including team members, associated posts, requirements, and direct apply options for students.

---

### 8. Create Project
**Route:** `/create-project`
**Auth required:** Researcher only

A form page for researchers to create a new research project. Fields include title, description, category, status, research areas, required skills, and team composition settings.

---

### 9. Profile (My Profile)
**Route:** `/profile`
**Auth required:** Yes

The logged-in user's own editable profile page — role-specific.

**For Students:**
- Personal info: name, email, institution, bio, GPA
- Skills (tagged by source: manual / CV-extracted / AI-inferred)
- Research areas of interest
- Projects and applications

**For Researchers:**
- Personal info, skills, research areas
- Projects they lead, posts they created
- Global role badge (admin / team leader / member)

All sections are inline-editable. Skills and research areas use a tag chip interface (`SkillChipsInput`).

---

### 10. Public Person Profile
**Route:** `/people/:role/:id`
**Auth required:** Yes

A read-only profile of another user. Works for both students and researchers. Displays name, institution, bio, skills, research areas, and activity (projects, posts, applications). Linked from search results, post creators, and team member lists.

---

### 11. My Posts
**Route:** `/my-posts`
**Auth required:** Researcher only

All posts created by the current researcher. Toggle between Recruitment and Discussion posts, filter by status, edit or delete any post, and view per-post application counts.

---

### 12. Create Post / Submit
**Route:** `/submit`
**Auth required:** Researcher only

A rich form for researchers to publish a post under one of their projects.

**Form fields:** Post type (Recruitment / Discussion), title, description, linked project, status, allow students / researchers toggles, application deadline, topic tags, required skills, collaboration type.

---

### 13. Applications
**Route:** `/applications`
**Auth required:** Yes

Shows all applications the current user has submitted (students). Each card shows the post applied to, project name, current status (`submitted` / `under_review` / `accepted` / `rejected`), and date applied.

---

### 14. AMS — Application Management System
**Route:** `/ams`
**Auth required:** Researcher only

The researcher's control center for reviewing incoming applications.

**How it works:**
1. Select one of your posts from a dropdown.
2. All applications for that post are loaded.
3. Search and filter by status (submitted / under review / accepted / rejected).
4. Each applicant card shows name, institution, GPA, cover letter, and status.
5. Accept ✅ or Reject ❌ with one click.
6. The ✨ icon links to the AI Ranking page for smart shortlisting.

---

### 15. AI Ranking
**Route:** `/ranking`
**Auth required:** Researcher only

The AI-powered applicant ranking tool.

**How it works:**

```
1. Select a project → required skills are pre-loaded as weighted criteria
2. Adjust skill weights (sliders: 0.0 → 1.0)
3. Add or remove skills from criteria
4. Click "Run Ranking"
   → Request sent to AI Ranking Service (port 8000)
   → Each applicant scored on:
        Skill match score    × 0.50
        Experience score     × 0.20
        Motivation score     × 0.30
5. Ranked leaderboard appears:
        #1  Ahmed B.   0.87  ████████████  [Python, ML]
        #2  Sara M.    0.74  ████████      [NLP]
        #3  Yacine L.  0.61  ██████        [Python]
```

---

### 16. Teams
**Route:** `/teams`
**Auth required:** No (public)

A directory of all research labs and teams. Each card shows team name, short name, institution, and description.

---

### 17. Team Detail
**Route:** `/teams/:id`
**Auth required:** No (public)

Full profile of a research lab — description, contact email, address, member list with roles, and associated projects.

---

### 18. About
**Route:** `/about`
**Auth required:** No (public)

A static page explaining the platform's mission, the ENSIA context, and the team behind it.

---

## AI Services

### CV Extractor Service (port 5001)

A Python Flask microservice that reads a PDF CV using OCR and a Groq-hosted Llama LLM to extract structured profile data.

**Tech:** `Flask`, `pdfplumber`, `pytesseract`, `pdf2image`, `opencv-python`, `groq`

**Endpoint:** `POST /extract`

**Output example:**
```json
{
  "first_name": "Ahmed",
  "last_name": "Bensalem",
  "skills": ["Python", "Machine Learning", "TensorFlow"],
  "education": ["M.Sc. Computer Science — ENSIA 2024"],
  "experience": ["Research Intern at CERIST — 6 months"],
  "research_areas": ["Deep Learning", "NLP"]
}
```

**Start the service:**
```bash
cd research_collab_backend/cv_extractor_service
pip install pdfplumber pytesseract pdf2image opencv-python flask flask-cors groq python-dotenv
# Set GROQ_API_KEY in .env
python cv_extractor.py
# http://localhost:5001
```

> **System dependencies required:** Tesseract OCR and Poppler. See the full setup notes in `cv_extractor.py`.

---

### Student Ranking Service (port 8000)

A Python Flask microservice that scores and ranks applicants using fuzzy skill matching and a weighted scoring formula.

**Scoring formula:**
```
final_score = (skill_score × 0.5) + (experience × 0.2) + (motivation × 0.3)
```

Skill matching uses `difflib.SequenceMatcher` with a 0.5 similarity threshold — so "ML" and "Machine Learning" still match.

**Endpoint:** `POST /rank`

**Input:**
```json
{
  "project": { "skills": { "Python": 0.8, "Deep Learning": 0.6 } },
  "students": [
    { "name": "Ahmed B.", "skills": ["Python", "PyTorch"], "experience": 0.7, "motivation": 0.9 }
  ]
}
```

**Start the service:**
```bash
cd ai_ranking_service
pip install flask flask-cors
python app.py
# http://localhost:8000
```

---

## Backend API Reference

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | No | Health check |
| `POST` | `/auth/register` | No | Register a new user |
| `POST` | `/auth/login` | No | Login, returns JWT tokens |
| `POST` | `/auth/logout` | Yes | Logout |
| `GET` | `/students` | Yes | List all students |
| `GET/PUT` | `/students/:id` | Yes | Get / update student profile |
| `GET` | `/researchers` | Yes | List all researchers |
| `GET/PUT` | `/researchers/:id` | Yes | Get / update researcher profile |
| `GET/POST` | `/projects` | Yes | List or create projects |
| `GET/PUT/DELETE` | `/projects/:id` | Yes | Manage a project |
| `GET/POST` | `/posts` | Yes | List or create posts |
| `GET` | `/posts/my-posts` | Yes | Current user's posts |
| `PUT/DELETE` | `/posts/:id` | Yes | Manage a post |
| `GET` | `/recruitment-posts` | Yes | List recruitment posts |
| `GET` | `/discussion-posts` | Yes | List discussion posts |
| `GET/POST` | `/applications` | Yes | List or submit applications |
| `PATCH` | `/applications/:id` | Yes | Update application status |
| `GET` | `/teams` | No | List all teams |
| `GET` | `/teams/:id` | No | Get team detail |
| `GET` | `/skills` | Yes | List all skills |
| `GET` | `/research-areas` | Yes | List all research areas |

> All protected routes require `Authorization: Bearer <token>` header.

---

## Database Models

| Model | Description |
|-------|-------------|
| `students` | Student accounts — GPA, bio, institution |
| `researchers` | Researcher accounts — bio, institution, global role |
| `projects` | Research projects — title, status, category |
| `project_posts` | Posts under a project (recruitment or discussion) |
| `post_student_applications` | Applications submitted by students |
| `post_researcher_applications` | Applications submitted by researchers |
| `teams` | Research labs / teams |
| `team_memberships` | Who belongs to which team, with role |
| `project_students` | Students on a project |
| `project_researchers` | Researchers on a project |
| `skills` | Skill catalogue |
| `student_skills` | Skills linked to a student (source: manual / CV / inferred) |
| `researcher_skills` | Skills linked to a researcher |
| `research_areas` | Research domain catalogue (18 domains) |
| `researcher_research_areas` | Researcher ↔ research area mapping |
| `project_research_areas` | Project ↔ research area mapping |
| `documents` | Uploaded files (CVs, papers) |
| `student_cvs` / `researcher_cvs` | CV document references per user |
| `tags` | Free-form topic tags for posts |
| `recruitment_posts` | Recruitment-specific post metadata |
| `discussion_posts` | Discussion-specific post metadata |
| `student_post_recommendations` | AI-generated post recommendations for students |
| `labs` | Physical lab metadata (address, emails) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, React Router v6 |
| **UI / Animation** | Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript |
| **ORM** | Prisma (MySQL adapter) |
| **Database** | MySQL 8 |
| **Auth** | JWT (access + refresh token pattern) |
| **File Upload** | Multer (backend), drag-and-drop (frontend) |
| **CV Extractor AI** | Python Flask, pdfplumber, Tesseract OCR, Groq API (Llama LLM) |
| **Ranking AI** | Python Flask, difflib fuzzy skill matching |

---

## Project Structure

```
GroupProject/
│
├── research_collab_platform/          # React Frontend (Vite · port 5173)
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx               # Landing page
│       │   ├── Signup.tsx             # Multi-step CV onboarding
│       │   ├── Login.tsx              # Authentication
│       │   ├── Explore.tsx            # Main post feed
│       │   ├── Search.tsx             # Unified search
│       │   ├── Projects.tsx           # My projects list
│       │   ├── ProjectDetail.tsx      # Single project view
│       │   ├── CreateProject.tsx      # New project form
│       │   ├── Profile.tsx            # My editable profile
│       │   ├── PublicPersonProfile.tsx# Read-only user profiles
│       │   ├── MyPosts.tsx            # Researcher's posts
│       │   ├── CreatePost.tsx         # New post form
│       │   ├── Applications.tsx       # My applications (student)
│       │   ├── AMS.tsx                # Application management (researcher)
│       │   ├── Ranking.tsx            # AI ranking tool
│       │   ├── Teams.tsx              # Lab/team directory
│       │   ├── TeamDetail.tsx         # Single team view
│       │   └── About.tsx              # About page
│       ├── components/
│       │   ├── Navbar.tsx             # Top navigation (role-aware)
│       │   ├── Footer.tsx             # Site footer
│       │   ├── Layout.tsx             # Page wrapper
│       │   ├── FloatingChat.tsx       # AI chat widget (all pages)
│       │   ├── ApplicationForm.tsx    # Inline apply modal
│       │   └── SkillChipsInput.tsx    # Tag chip input component
│       └── lib/
│           ├── api.ts                 # All API calls (typed)
│           └── utils.ts               # Helpers
│
├── research_collab_backend/           # Node.js Backend (Express · port 5000)
│   └── src/
│       ├── routes/                    # All API route handlers
│       ├── controllers/               # Business logic controllers
│       ├── services/                  # Service layer (DB + logic)
│       ├── middleware/
│       │   ├── auth.ts                # JWT verification middleware
│       │   └── upload.ts              # Multer file upload config
│       ├── lib/
│       │   ├── prisma.ts              # Prisma client singleton
│       │   ├── http.ts                # HTTP response helpers
│       │   └── validators.ts          # Input validation
│       └── prisma/
│           └── schema.prisma          # Full database schema (32 models)
│
│   └── cv_extractor_service/          # CV AI Service (Flask · port 5001)
│       └── cv_extractor.py            # PDF → structured profile via Groq/Llama
│
└── ai_ranking_service/                # Ranking AI Service (Flask · port 8000)
    └── app.py                         # POST /rank endpoint
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MySQL](https://www.mysql.com/) 8 (running locally)
- [Python](https://www.python.org/) 3.8+
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/ilafe30/GroupProject.git
cd GroupProject
```

### 2. Set Up the Backend (port 5000)

```bash
cd research_collab_backend
npm install
cp .env.example .env   # then fill in your values (see Environment Variables)
npx prisma generate
npx prisma migrate dev
npm run dev
# → http://localhost:5000
```

### 3. Set Up the Frontend (port 5173)

```bash
cd ../research_collab_platform
npm install
npm run dev
# → http://localhost:5173
```

### 4. Set Up the CV Extractor (port 5001)

```bash
cd ../research_collab_backend/cv_extractor_service
pip install pdfplumber pytesseract pdf2image opencv-python flask flask-cors groq python-dotenv
cp .env.example .env   # add your GROQ_API_KEY
python cv_extractor.py
# → http://localhost:5001
```

> Requires **Tesseract OCR** and **Poppler** installed on your system. See setup notes at the top of `cv_extractor.py`.

### 5. Set Up the AI Ranking Service (port 8000)

```bash
cd ../../../ai_ranking_service
pip install flask flask-cors
python app.py
# → http://localhost:8000
```

### All Services at a Glance

| Service | URL | Required |
|---------|-----|----------|
| Frontend | http://localhost:5173 | Always |
| Backend API | http://localhost:5000 | Always |
| CV Extractor | http://localhost:5001 | For Sign Up |
| AI Ranking | http://localhost:8000 | For Ranking page |

---

## Environment Variables

### Backend (`research_collab_backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend port | `5000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `secret` |
| `DB_NAME` | Database name | `research_collab_db` |
| `DATABASE_URL` | Prisma connection URL | `mysql://root:secret@localhost:3306/research_collab_db` |
| `JWT_ACCESS_SECRET` | JWT access token secret | any long random string |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | any long random string |
| `CLIENT_URL` | Frontend URL (for CORS) | `http://localhost:5173` |
| `UPLOAD_DIR` | File upload directory | `uploads` |

### CV Extractor (`cv_extractor_service/.env`)

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | API key from [console.groq.com](https://console.groq.com) |

> ⚠️ Never commit `.env` files — they are already in `.gitignore`.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit with a clear message: `git commit -m "feat: describe what you added"`
4. Push: `git push origin feature/your-feature-name`
5. Open a Pull Request

**Commit message conventions:**

| Prefix | Use for |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `refactor:` | Code restructuring |
| `chore:` | Build / tooling changes |

---

<p align="center">
  Built with ❤️ by the ENSIA Group Project Team · 2026
</p>

# Research Collaboration Platform

Full-stack app (React + Node + Prisma + MySQL).

1. Clone repo: git clone https://github.com/ilafe30/GroupProject.git
2. Backend: cd research_collab_backend
3. Install: npm install
4. Create .env (use provided variables + DATABASE_URL)
5. Run DB: npx prisma generate && npx prisma migrate dev
6. Start backend: npm run dev (port 5000)
7. Frontend: cd research_collab_platform
8. Install: npm install
9. Start frontend: npm run dev (port 5173)
10. IMPORTANT: run MySQL + do NOT forget .env file

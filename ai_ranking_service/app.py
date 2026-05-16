from flask import Flask, request, jsonify
from flask_cors import CORS
from difflib import SequenceMatcher

app = Flask(__name__)
CORS(app)


def normalize_skills(skills):
    return [s.lower().strip() for s in skills]


def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def compute_score(student, project):
    student_skills = normalize_skills(student["skills"])

    skill_score = 0
    matched_skills = []

    total_weight = sum(project["skills"].values())

    for skill, weight in project["skills"].items():
        for s in student_skills:
            sim = similarity(skill, s)

            if sim > 0.5:
                skill_score += weight
                matched_skills.append(skill)
                break

    skill_score = skill_score / total_weight

    experience = student.get("experience", 0)
    motivation = student.get("motivation", 0)

    final_score = (
        (skill_score * 0.5)
        + (experience * 0.2)
        + (motivation * 0.3)
    )

    return {
        "final_score": round(final_score, 2),
        "skill_score": round(skill_score, 2),
        "experience": experience,
        "motivation": motivation,
        "matched_skills": matched_skills,
    }


@app.route("/rank", methods=["POST"])
def rank_students():
    data = request.json

    project = data["project"]
    students = data["students"]

    results = []

    for student in students:
        result = compute_score(student, project)

        results.append({
            "name": student["name"],
            "final_score": result["final_score"],
            "skill_score": result["skill_score"],
            "experience": result["experience"],
            "motivation": result["motivation"],
            "matched_skills": result["matched_skills"]
        })

    results.sort(key=lambda x: x["final_score"], reverse=True)

    return jsonify(results)


if __name__ == "__main__":
    app.run(port=8000, debug=True)
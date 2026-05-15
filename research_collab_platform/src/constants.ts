
import { Lab } from "./types";

export const LABS: Lab[] = [
  {
    id: "mldl",
    name: "Machine Learning & Deep Learning Lab",
    specialization: "Predictive modeling, neural networks, and algorithmic optimization.",
    description: "The MLDL Lab focuses on the bleeding edge of deep learning. We bridge the gap between theoretical neural network architectures and practical applications in industry and robotics.",
    lead: "Dr. Amine Mansouri",
    faculty: ["Dr. Sarah Benali", "Prof. Karim Tahi"],
    legacy: ["Mounir K.", "Lina S.", "Yacine R."],
    projects: [
      { title: "Optimizing Transformer Architectures for Low-resource Settings", authors: "Amine M., Sarah B." },
      { title: "Self-Supervised Learning in Time Series Analysis", authors: "Mounir K., Karim T." }
    ]
  },
  {
    id: "nlp",
    name: "Natural Language Processing Lab",
    specialization: "Arabic NLP, multilingual models, and semantic analysis.",
    description: "Our mission is to empower machines to understand the complexity of human language, with a special focus on the rich linguistic landscape of the Arabic world and Algerian dialects.",
    lead: "Dr. Fatma Zohra",
    faculty: ["Dr. Omar El-Farouk", "Dr. Myriam A."],
    legacy: ["Anis B.", "Meriem T."],
    projects: [
      { title: "Universal Dependencies for High-level Dialects", authors: "Fatma Z., Anis B." },
      { title: "Contextual Embeddings in Medical Transcripts", authors: "Omar E." }
    ]
  },
  {
    id: "cvr",
    name: "Computer Vision & Robotics Lab",
    specialization: "Autonomous systems, image recognition, and human-robot interaction.",
    description: "Visual intelligence is at the core of robotics. We develop algorithms that allow autonomous systems to perceive, navigate, and interact with the physical world in real-time.",
    lead: "Prof. Sid Ahmed",
    faculty: ["Dr. Leila K.", "Dr. Hamza B."],
    legacy: ["Walid M.", "Ranya O."],
    projects: [
      { title: "Real-time Object Detection for Autonomous Drones", authors: "Sid Ahmed, Hamza B." },
      { title: "Humanoid Navigation in Unstructured Environments", authors: "Leila K." }
    ]
  },
  {
    id: "dsbd",
    name: "Data Science & Big Data Lab",
    specialization: "Scalable data processing, visualization, and statistical modeling.",
    description: "Data is the new oil. We build the refineries—scalable pipelines and analytical frameworks that derive meaningful insights from massive, heterogeneous datasets.",
    lead: "Dr. Reda Bellala",
    faculty: ["Dr. Ines B.", "Prof. Youcef M."],
    legacy: ["Sofiane T.", "Amira G."],
    projects: [
      { title: "Petabyte-scale Analytics for Genomic Sequencing", authors: "Ines B., Reda B." },
      { title: "Predictive Maintenance for Industrial IoT", authors: "Youcef M." }
    ]
  },
  {
    id: "hais",
    name: "Hardware & AI Systems Lab",
    specialization: "Edge computing, VLSI design for AI, and energy-efficient inference.",
    description: "AI shouldn't only run in the cloud. We design the hardware of tomorrow—chips and systems specialized for efficient AI inference at the edge.",
    lead: "Dr. Tarek Meziani",
    faculty: ["Dr. Nadia H.", "Dr. Farid S."],
    legacy: ["Zineb B.", "Mehdi L."],
    projects: [
      { title: "Custom ASIC for Binary Neural Networks", authors: "Tarek M., Nadia H." },
      { title: "FPGA Acceleration for Real-time Signal Processing", authors: "Farid S." }
    ]
  }
];

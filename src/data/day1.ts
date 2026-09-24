import type { TrainingDay } from "@/types/program";

export const day1: TrainingDay = {
  id: "day-1",
  dayNumber: 1,
  title: "Passport Service Foundations",
  description:
    "Understand HelloGov's passport service, terminology, requirements and process before moving into customer operations.",
  position: 1,
  isPublished: false,

  modules: [
    {
      id: "m101",
      title: "HelloGov & iVisa",
      description:
        "Why the partnership exists and how Customer Support fits in.",
      objective:
        "Understand what HelloGov and iVisa do, why the partnership was created, and how Customer Service supports customers throughout the process.",
      durationMinutes: 30,
      required: true,
      position: 1,

      materials: [
        {
          id: "r101a",
          title: "Company & Partnership Overview",
          description: "Trainer deck",
          materialType: "presentation",
          url: null,
          required: true,
          position: 1,
        },
        {
          id: "r101b",
          title: "HelloGov + iVisa",
          description: "Public HelloGov partnership page",
          materialType: "link",
          url: "https://www.hellogov.com/hellogov-ivisa",
          required: false,
          position: 2,
        },
      ],

      activities: [
        {
          id: "a101",
          title: "Explain HelloGov to a customer",
          description:
            "Practice explaining HelloGov clearly and concisely from a customer-facing perspective.",
          instructions:
            "A customer asks what HelloGov actually does. Write the answer you would give on a call in two or three sentences.",
          activityType: "written",
          durationMinutes: null,
          required: true,
          position: 1,
        },
      ],
    },

    {
      id: "m102",
      title: "Handbook Intro",
      description:
        "The Customer Support Employee Handbook and how to navigate it.",
      objective:
        "Know the Customer Support Employee Handbook and where to look things up during the rest of training and on the floor.",
      durationMinutes: null,
      required: true,
      position: 2,

      materials: [
        {
          id: "r102a",
          title: "Customer Support Employee Handbook",
          description: "Document in preparation",
          materialType: "document",
          url: null,
          required: true,
          position: 1,
        },
      ],

      activities: [
        {
          id: "a102",
          title: "Find it in the handbook",
          description:
            "Practice locating information independently in the handbook.",
          instructions:
            "Your trainer will give you three questions. Find the relevant information in the handbook.",
          activityType: "practice",
          durationMinutes: null,
          required: false,
          position: 1,
        },
      ],
    },

    {
      id: "m103",
      title: "Vocabulary",
      description:
        "Core passport and customer-support terminology used throughout onboarding.",
      objective:
        "Recognize and correctly use the most common terms agents will encounter when assisting HelloGov customers.",
      durationMinutes: null,
      required: true,
      position: 3,
      materials: [],
      activities: [],
    },

    {
      id: "m104",
      title: "Document Etiquette",
      description:
        "How customer documents should be reviewed, discussed and handled.",
      objective:
        "Understand the expected standards when working with customer documentation.",
      durationMinutes: null,
      required: true,
      position: 4,
      materials: [],
      activities: [],
    },

    {
      id: "m105",
      title: "Types of Passport & Requirements",
      description:
        "Passport service types and the requirements associated with each one.",
      objective:
        "Identify the appropriate passport service and understand the documentation requirements for common customer scenarios.",
      durationMinutes: null,
      required: true,
      position: 5,
      materials: [],
      activities: [],
    },

    {
      id: "m106",
      title: "Passport Processing",
      description:
        "How passport applications move through the process.",
      objective:
        "Understand the main stages of passport processing and what happens at each stage.",
      durationMinutes: null,
      required: true,
      position: 6,
      materials: [],
      activities: [],
    },

    {
      id: "m107",
      title: "Processing Times & Prices",
      description:
        "Expected processing timelines, completion dates and customer pricing.",
      objective:
        "Understand processing times and prices and practice calculating expected completion dates for customer scenarios.",
      durationMinutes: null,
      required: true,
      position: 7,
      materials: [],
      activities: [],
    },

    {
      id: "m108",
      title: "Training Charts",
      description:
        "How to locate and interpret frequently needed information in HelloGov Training Charts.",
      objective:
        "Learn to understand and quickly read the Training Charts provided by HelloGov.",
      durationMinutes: 60,
      required: true,
      position: 8,

      materials: [
        {
          id: "r108a",
          title: "HelloGov Training Charts",
          description: "Official training reference",
          materialType: "document",
          url: null,
          required: true,
          position: 1,
        },
      ],

      activities: [],
    },
  ],

  checkpoints: [
    {
      id: "cp1",
      title: "Knowledge Check",
      description:
        "Check understanding of the foundational passport-service topics covered during Day 1.",
      checkpointType: "knowledge",
      passingScore: 80,
      position: 1,
    },
  ],
};
import { Icons } from "@/components/icons";
import { HomeIcon, NotebookIcon } from "lucide-react";

export const DATA = {
  name: "Akash Kanagarajah",
  initials: "AK",
  url: "https://akashkanagarajah.com",
  location: "Toronto, ON",
  locationLink: "https://maps.app.goo.gl/TorontoON",
  description:
    "Computer Engineering graduate (B.Eng.) and Engineer-in-Training (EIT) with OSCA nuclear site security clearance. Based in Toronto, Ontario.",
  summary:
    "I'm a [Computer Engineering graduate](/#education) from Toronto Metropolitan University (B.Eng., 2024) with hands-on experience in control-system software, hardware qualification, and production-line automation. My engineering year at OPG Pickering Nuclear Generating Station gave me deep exposure to SCADA systems, Python-driven diagnostics, and safety-critical environments — backed by an **OSCA nuclear site security clearance** (CSIS & OPP verified, Pickering & Darlington NGS). I've also worked in electrical assembly at ABB, automotive manufacturing at Stellantis and Honda, and warehouse operations at UPS. I'm always looking for opportunities where I can apply my engineering skills to solve real-world problems.",
  avatarUrl: "/me.webp",
  skills: {
    "Languages": [
      "Python",
      "C",
      "C++",
      "VHDL",
      "SQL",
      "Shell / Bash",
    ],
    "Hardware & Test Equipment": [
      "FPGA Design (Xilinx)",
      "Oscilloscopes",
      "Multimeters",
      "Soldering & Micro-welding",
      "Circuit Breaker Retrofitting",
    ],
    "Software & Tools": [
      "AutoCAD",
      "Git",
      "JIRA",
      "Microsoft Office Suite",
      "POS Systems",
    ],
    "Systems & Platforms": [
      "SCADA",
      "DCC / PACE Control Computers",
      "Windows",
      "Linux",
    ],
    "Standards & Compliance": [
      "CSA N290.14-15",
      "OPG Engineering Change Control (ECC)",
      "Nuclear Safety Protocols",
    ],
  },
  navbar: [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/blog", icon: NotebookIcon, label: "Blog" },
  ],
  contact: {
    email: "akashkanagarajah@gmail.com",
    tel: "+12895445279",
    social: {
      GitHub: {
        name: "GitHub",
        // No GitHub profile URL yet — update when available
        url: "#",
        icon: Icons.github,
        navbar: true,
      },
      LinkedIn: {
        name: "LinkedIn",
        // No LinkedIn profile URL yet — update when available
        url: "#",
        icon: Icons.linkedin,
        navbar: true,
      },
      X: {
        name: "X",
        // No X/Twitter profile yet — left blank intentionally
        url: "#",
        icon: Icons.x,
        navbar: true,
      },
      Youtube: {
        name: "Youtube",
        // No YouTube channel yet — left blank intentionally
        url: "#",
        icon: Icons.youtube,
        navbar: true,
      },
      email: {
        name: "Send Email",
        url: "mailto:akashkanagarajah@gmail.com",
        icon: Icons.email,
        navbar: false,
      },
    },
  },

  work: [
    {
      company: "Ontario Power Generation",
      href: "https://www.opg.com/",
      badges: ["OSCA Clearance"],
      location: "Pickering, ON",
      title: "Control Computers Intern (Professional Engineering Year)",
      logoUrl: "/OPG.webp",
      start: "May 2022",
      end: "April 2023",
      description:
        "Developed a Python diagnostic tool to validate DES serial data packet integrity in SCADA data streams from operating reactor units. Built automation scripts that streamlined system validation and reduced manual testing time. Executed formal hardware qualification test procedures for backup control systems across DCC and PACE platforms. Prepared 10+ qualification test procedures compliant with CSA N290.14-15. Holds OSCA Nuclear Site Access Security Clearance (CSIS & OPP verified — Pickering & Darlington NGS).",
    },
    {
      company: "UPS Canada",
      badges: [],
      href: "https://www.ups.com/",
      location: "Caledon / Brampton, ON",
      title: "Operations Associate",
      logoUrl: "",
      start: "November 2025",
      end: "Present",
      description:
        "Monitoring high-volume inbound and outbound shipment flow to ensure accurate routing and on-time dispatch. Verifying shipment accuracy using structured tracking processes in a regulated logistics environment. Identifying workflow bottlenecks and resolving sorting discrepancies to maintain operational efficiency.",
    },
    {
      company: "ABB Ltd.",
      badges: [],
      href: "https://global.abb/group/en",
      location: "Brampton, ON",
      title: "Electrical Assembly Technician Intern",
      logoUrl: "/ABB.jpg",
      start: "June 2019",
      end: "August 2019",
      description:
        "Assembled and wired power distribution and switchgear systems following AutoCAD electrical schematics. Retrofitted circuit breakers (VM1, VD4, ADVAC, AMVAC, ITE K-600) using soldering and micro-welding techniques. Collaborated with engineers during hardware retrofits and on-site testing using oscilloscopes and multimeters.",
    },
    {
      company: "Stellantis NV (FCA)",
      badges: [],
      href: "https://www.stellantis.com/",
      location: "Brampton, ON",
      title: "Automotive Production Technician — Engine Zone",
      logoUrl: "",
      start: "September 2021",
      end: "April 2022",
      description:
        "Assembled Dodge Charger, Challenger, and Police Pursuit Vehicles on a high-volume production line. Installed powertrain components including transmissions, struts, and alternator mounts with precision torque accuracy. Operated computer-calibrated assembly tools and collaborated with maintenance staff to troubleshoot mechanical issues.",
    },
    {
      company: "Honda of Canada Mfg.",
      badges: [],
      href: "https://www.honda.ca/",
      location: "Alliston, ON",
      title: "Student Assembler — Quality Zone",
      logoUrl: "",
      start: "May 2021",
      end: "August 2021",
      description:
        "Performed detailed end-of-line inspections on Honda Civics to verify alignment, body panel fitment, finish, and interior quality prior to shipment. Identified and corrected defects to ensure vehicles met dealership-ready standards in a high-volume manufacturing environment.",
    },
  ],
  education: [
    {
      school: "Toronto Metropolitan University",
      href: "https://www.torontomu.ca/",
      degree: "Bachelor of Engineering — Computer Engineering (B.Eng.)",
      logoUrl: "/TMU.png",
      start: "2019",
      end: "2024",
    },
    {
      school: "Advanced Placement",
      href: "https://ap.collegeboard.org/",
      degree: "AP High School Honours Graduate",
      logoUrl: "/AP.png",
      start: "2016",
      end: "2019",
    },
  ],
  projects: [
    {
      title: "SCADA Data Integrity Diagnostic Tool",
      href: "",
      dates: "May 2022 - April 2023",
      active: false,
      description:
        "Developed a Python diagnostic tool at OPG Pickering NGS to validate DES serial data packet integrity, parsing hexadecimal sequence numbers to detect data corruption and transmission errors in SCADA data streams from operating reactor units.",
      technologies: [
        "Python",
        "SCADA",
        "Serial Communication",
        "Hexadecimal Parsing",
        "Data Validation",
      ],
      links: [],
      image: "",
      video: "",
    },
    {
      title: "Control Computer Validation Automation",
      href: "",
      dates: "May 2022 - April 2023",
      active: false,
      description:
        "Built Python automation scripts at OPG that streamlined system validation workflows and reduced manual testing time for control computer updates in a safety-critical nuclear environment. Supported rollout across 4 DCC control computers.",
      technologies: [
        "Python",
        "Automation",
        "DCC / PACE Platforms",
        "Test Validation",
        "CSA N290.14-15",
      ],
      links: [],
      image: "",
      video: "",
    },
    {
      title: "FPGA VGA Pong Game",
      href: "",
      dates: "2019 - 2024",
      active: false,
      description:
        "Designed and implemented a classic Pong game on an FPGA using VHDL, driving VGA display output for real-time graphics rendering. Developed as part of Computer Engineering coursework at Toronto Metropolitan University.",
      technologies: [
        "VHDL",
        "FPGA (Xilinx)",
        "VGA Display",
        "Digital Logic Design",
      ],
      links: [],
      image: "",
      video: "",
    },
    {
      title: "RISC CPU on FPGA",
      href: "",
      dates: "2019 - 2024",
      active: false,
      description:
        "Designed and synthesized a custom RISC processor on an FPGA, implementing instruction fetch, decode, execute, and memory stages. Built as part of computer architecture coursework at TMU.",
      technologies: [
        "VHDL",
        "FPGA (Xilinx)",
        "RISC Architecture",
        "Computer Architecture",
        "Digital Design",
      ],
      links: [],
      image: "",
      video: "",
    },
  ],
  // No hackathon participation to list — left blank intentionally
  hackathons: [],
} as const;

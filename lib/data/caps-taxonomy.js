/**
 * CAPS Curriculum Taxonomy (Grades 8–11)
 * Source-informed (CAPS-aligned references incl. Siyavula). Curated for Exam/Test Questions flow.
 * Scope: Subjects -> Grades -> Topics -> Sub-topics (display strings)
 *
 * Notes:
 * - This taxonomy is used for listing Topics/Sub-topics. It does not include content/notes.
 * - Keep names learner-facing and CAPS-consistent. Avoid over-nesting for WhatsApp brevity.
 * - Safe to extend incrementally. Add missing topics/sub-topics as needed.
 */

const CAPS_TAXONOMY = {
  Mathematics: {
    8: {
      topics: {
        "Numbers, Operations & Relationships": [
          "Integers and operations",
          "Fractions, decimals, percentages",
          "Ratio, rate and proportion",
          "Laws of exponents (intro)",
        ],
        "Patterns, Functions & Algebra": [
          "Numeric patterns",
          "Algebraic expressions (simplify)",
          "Substitution",
          "Simple linear equations",
        ],
        "Space & Shape (Geometry)": [
          "Angles and parallel lines",
          "Triangles and quadrilaterals",
          "Constructions and symmetry",
        ],
        Measurement: [
          "Perimeter and area (rectangles/triangles/circles)",
          "Volume and surface area (prisms)",
        ],
        "Data Handling & Probability": [
          "Collect/represent data (bar, pie, histogram)",
          "Mean, median, mode, range",
          "Basic probability (equally likely)",
        ],
      },
    },
    9: {
      topics: {
        "Numbers, Operations & Relationships": [
          "Exponents and scientific notation",
          "Real number properties",
        ],
        "Patterns, Functions & Algebra": [
          "Algebraic expressions (expand, factorise)",
          "Linear equations and inequalities",
          "Cartesian plane and straight-line graphs",
        ],
        "Space & Shape (Geometry)": [
          "Angle relationships and polygons",
          "Pythagoras’ Theorem",
          "Similar figures (intro)",
        ],
        Measurement: [
          "Area and perimeter (compound shapes)",
          "Surface area and volume (cylinders)",
        ],
        "Data Handling & Probability": [
          "Representing and interpreting data",
          "Probability with Venn diagrams (intro)",
        ],
      },
    },
    10: {
      topics: {
        Algebra: [
          "Laws of exponents (incl. rational exponents)",
          "Algebraic expressions (simplify, factorise)",
          "Quadratic equations (solve)",
          "Simultaneous linear equations",
          "Rational expressions",
        ],
        "Patterns, Sequences & Series": [
          "Numeric patterns",
          "Arithmetic sequences",
          "Geometric sequences (intro)",
        ],
        "Functions & Graphs": [
          "Linear functions",
          "Quadratic functions (parabola)",
          "Hyperbolic and exponential (intro)",
          "Transformations (shifts/reflections)",
        ],
        Trigonometry: [
          "Trig ratios in right triangles",
          "Special angles",
          "Trig equations (basic)",
          "Reduction rules (intro)",
        ],
        "Euclidean Geometry & Measurement": [
          "Similarity (AA and ratio chains)",
          "Proportionality in triangles",
          "Area/volume applications",
        ],
        "Analytical Geometry": [
          "Distance, midpoint, gradient",
          "Equation of a straight line",
        ],
        Probability: ["Counting outcomes", "Basic Venn/probability rules"],
        Statistics: [
          "Central tendency (mean/median/mode)",
          "Dispersion (range, IQR) (intro)",
        ],
      },
    },
    11: {
      topics: {
        Algebra: [
          "Factor & remainder theorems",
          "Exponents & logarithms (laws, solving)",
          "Quadratic inequalities",
        ],
        "Sequences & Series": [
          "Arithmetic series",
          "Geometric series",
          "Sigma notation",
        ],
        "Functions & Graphs": [
          "Quadratic, hyperbola, exponential (analysis)",
          "Transformations and inverses (intro)",
        ],
        Trigonometry: [
          "Reduction formulae",
          "Trig identities (fundamental)",
          "Trig equations (general solution)",
          "Sine/cosine rule and area rule",
        ],
        "Euclidean Geometry": [
          "Circle theorems (tangent-chord, equal angles, etc.)",
          "Similarity and proportionality proofs",
        ],
        "Analytical Geometry": [
          "Angle between lines",
          "Parallel/perpendicular conditions",
          "Distance to a point (line form)",
        ],
        Probability: [
          "Venn diagrams and set notation",
          "Conditional probability",
        ],
        Statistics: ["Grouped data and ogives", "Standard deviation (intro)"],
      },
    },
  },

  "Mathematical Literacy": {
    10: {
      topics: {
        "Numbers & Calculations with Technology": [
          "Rounding, estimation, scientific notation",
          "Calculator skills",
        ],
        Finance: [
          "Simple and compound interest",
          "Budgets and cost price/mark-up",
          "Tariffs and banking products",
        ],
        Measurement: [
          "Units and conversions",
          "Perimeter, area, volume",
          " Scale and time",
        ],
        "Maps, Plans & Models": [
          "Scale drawings and floor plans",
          "Timetables and routes",
        ],
        "Data Handling & Probability": [
          "Collecting/representing data",
          "Averages and spread",
          "Basic probability",
        ],
      },
    },
    11: {
      topics: {
        Finance: ["Credit/loans and interest", "Budgets, VAT, tax"],
        Measurement: [
          "Perimeter/area/volume in contexts",
          "Rates (speed, density, flow)",
        ],
        "Maps, Plans & Models": ["GIS basics", "Navigation and bearings"],
        "Data & Probability": [
          "Box-and-whisker, percentiles",
          "Risk and probability in context",
        ],
      },
    },
  },

  "Physical Sciences": {
    10: {
      topics: {
        Mechanics: [
          "Vectors and scalars",
          "Motion (position, velocity, acceleration)",
          "Graphs of motion",
        ],
        "Waves, Sound & Light": [
          "Transverse/longitudinal waves",
          "Sound properties",
          "Light (intro)",
        ],
        "Matter & Materials": [
          "Particle model",
          "States and changes",
          "Atomic structure (intro)",
        ],
        "Chemical Change": [
          "Physical vs chemical change",
          "Energy and reactions (intro)",
        ],
        Electricity: [
          "Electric circuits (series/parallel)",
          "Current, voltage, resistance",
          "Ohm’s Law (intro)",
        ],
      },
    },
    11: {
      topics: {
        Mechanics: [
          "Newton’s laws",
          "Momentum and impulse",
          "Work, energy and power",
        ],
        "Waves, Sound & Light": [
          "Wave phenomena (interference, diffraction)",
          "Doppler effect",
        ],
        "Matter & Materials": [
          "Bonding and structure",
          "Intermolecular forces",
        ],
        "Chemical Change": [
          "Stoichiometry",
          "Energy changes (endothermic/exothermic)",
          "Rates of reaction (intro)",
        ],
        Electricity: [
          "DC circuits (internal resistance)",
          "Power and energy in circuits",
        ],
      },
    },
  },

  Geography: {
    10: {
      topics: {
        Mapwork: [
          "Topographic maps and orthophotos",
          "Scale and distance",
          "Contours and landforms",
        ],
        Climatology: [
          "Global circulation (Hadley/Ferrel/Polar cells)",
          "SA climate regions",
        ],
        Geomorphology: [
          "Drainage basins and fluvial processes",
          "Slope elements",
        ],
        "Development Geography": [
          "Indicators and concepts",
          "Factors influencing development",
        ],
      },
    },
    11: {
      topics: {
        Mapwork: ["GIS (intro)", "Cross-sections and gradients"],
        Climatology: [
          "Mid-latitude cyclones and tropical cyclones",
          "Urban climates",
        ],
        Geomorphology: [
          "Slope development and mass movement",
          "Structural landforms",
        ],
        "Settlement & Economic Geography": [
          "Rural and urban settlements",
          "Economic activities and sectors",
        ],
      },
    },
  },

  History: {
    10: {
      topics: {
        "World around 1600": ["Ming China", "Mughal India", "Songhai"],
        "European expansion and conquest": [
          "Portugal and Spain",
          "Impact on indigenous societies",
        ],
        "Transformations in southern Africa": [
          "Economy and society (1750–1850)",
        ],
      },
    },
    11: {
      topics: {
        Nationalisms: ["Case studies (e.g., Germany, Italy, Africa)"],
        "Apartheid South Africa (1948–c.1976)": [
          "Institutionalised segregation",
          "Resistance movements",
        ],
        "Independent Africa": ["Challenges and successes post-independence"],
      },
    },
  },

  "Life Sciences": {
    10: {
      topics: {
        "Life at Molecular, Cellular & Tissue level": [
          "Cells and organelles",
          "Cell division (mitosis)",
        ],
        "Life Processes in Plants & Animals": [
          "Transport systems (xylem/phloem, blood)",
          "Gas exchange (intro)",
        ],
        "Environmental Studies": [
          "Biosphere and ecosystems",
          "Human impact (intro)",
        ],
      },
    },
    11: {
      topics: {
        "Life at Molecular, Cellular & Tissue level": [
          "Meiosis and gametogenesis",
          "DNA and protein synthesis (intro)",
        ],
        "Life Processes in Plants & Animals": [
          "Homeostasis (intro)",
          "Excretion and osmoregulation (intro)",
        ],
        "Environmental Studies": [
          "Population ecology",
          "Human impact on environment",
        ],
      },
    },
  },
};

module.exports = { CAPS_TAXONOMY };


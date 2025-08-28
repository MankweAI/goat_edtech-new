/**
 * CAPS Curriculum Taxonomy (Grades 8–11)
 * Source-informed (CAPS-aligned references incl. Siyavula).
 * Used by Topic Practice flow for Subject → Grade → Topics → Sub-topics.
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
          "Bar, pie, histogram",
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
          "Expressions (expand, factorise)",
          "Linear equations and inequalities",
          "Cartesian plane & straight-line graphs",
        ],
        "Space & Shape (Geometry)": [
          "Angle relationships and polygons",
          "Pythagoras’ Theorem",
          "Similar figures (intro)",
        ],
        Measurement: [
          "Area/perimeter (compound shapes)",
          "Surface area/volume (cylinders)",
        ],
        "Data Handling & Probability": [
          "Representing & interpreting data",
          "Venn diagrams (intro)",
        ],
      },
    },
    10: {
      topics: {
        Algebra: [
          "Laws of exponents (incl. rational exponents)",
          "Expressions (simplify, factorise)",
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
        Probability: ["Counting outcomes", "Basic probability rules"],
        Statistics: ["Central tendency", "Dispersion (range, IQR) (intro)"],
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
        Statistics: ["Grouped data & ogives", "Standard deviation (intro)"],
      },
    },
  },

  "Mathematical Literacy": {
    10: {
      topics: {
        "Numbers & Calculations": [
          "Rounding & estimation",
          "Scientific notation",
          "Calculator skills",
        ],
        Finance: [
          "Simple/compound interest",
          "Budgets and mark-up",
          "Tariffs and banking",
        ],
        Measurement: [
          "Units & conversions",
          "Perimeter/area/volume",
          "Scale & time",
        ],
        "Maps, Plans & Models": [
          "Scale drawings & floor plans",
          "Timetables & routes",
        ],
        "Data Handling & Probability": [
          "Representing data",
          "Averages and spread",
          "Basic probability",
        ],
      },
    },
    11: {
      topics: {
        Finance: ["Credit/loans", "VAT/tax", "Budgets"],
        Measurement: ["Rates (speed/density/flow)", "Real contexts"],
        "Maps, Plans & Models": ["GIS (intro)", "Navigation & bearings"],
        "Data & Probability": [
          "Box-and-whisker/percentiles",
          "Risk & probability in context",
        ],
      },
    },
  },

  "Physical Sciences": {
    10: {
      topics: {
        Mechanics: ["Vectors and scalars", "Motion (v, a)", "Graphs of motion"],
        "Waves, Sound & Light": [
          "Wave types",
          "Sound properties",
          "Light (intro)",
        ],
        "Matter & Materials": [
          "Particle model",
          "States & changes",
          "Atomic structure (intro)",
        ],
        "Chemical Change": [
          "Physical vs chemical",
          "Energy & reactions (intro)",
        ],
        Electricity: [
          "Circuits (series/parallel)",
          "V, I, R",
          "Ohm’s Law (intro)",
        ],
      },
    },
    11: {
      topics: {
        Mechanics: ["Newton’s laws", "Momentum/impulse", "Work, energy, power"],
        "Waves, Sound & Light": ["Interference/diffraction", "Doppler effect"],
        "Matter & Materials": ["Bonding & structure", "Intermolecular forces"],
        "Chemical Change": [
          "Stoichiometry",
          "Energy changes",
          "Rates of reaction (intro)",
        ],
        Electricity: ["DC circuits (internal resistance)", "Power and energy"],
      },
    },
  },

  Geography: {
    8: {
      topics: {
        Mapwork: [
          "Latitude and longitude",
          "Direction and bearing",
          "Map scale and distance",
        ],
        "Weather & Climate (intro)": [
          "Elements of weather",
          "Factors influencing temperature and rainfall",
        ],
        Settlements: [
          "Types of settlements",
          "Settlement patterns and land use",
        ],
        "Resources & Sustainability (intro)": [
          "Renewable vs non-renewable resources",
          "Using resources wisely",
        ],
        "Water in the World": ["Water cycle", "Rivers and drainage basins"],
      },
    },
    9: {
      topics: {
        Mapwork: [
          "Topographic maps & orthophotos",
          "Scale conversions and gradients",
          "Intro to GIS concepts",
        ],
        Population: [
          "Population growth and structure",
          "Migration and urbanisation",
        ],
        "Development & Inequality": [
          "Development indicators",
          "Global and local inequalities",
        ],
        "Resources & Sustainability": [
          "Energy sources (renewables and non-renewables)",
          "Sustainable resource use",
        ],
        "Water Resources in South Africa": [
          "River systems and catchment areas",
          "Water management and scarcity",
        ],
      },
    },
    10: {
      topics: {
        Mapwork: [
          "Topographic maps and orthophotos",
          "Scale and distance",
          "Contours and landforms",
        ],
        Climatology: ["Global circulation cells", "SA climate regions"],
        Geomorphology: ["Drainage basins", "Slope elements"],
        "Development Geography": [
          "Indicators",
          "Factors influencing development",
        ],
      },
    },
    11: {
      topics: {
        Mapwork: ["GIS (intro)", "Cross-sections & gradients"],
        Climatology: ["Mid-latitude/tropical cyclones", "Urban climates"],
        Geomorphology: [
          "Slope development/mass movement",
          "Structural landforms",
        ],
        "Settlement & Economic Geography": ["Rural/urban", "Economic sectors"],
      },
    },
  },

  History: {
    8: {
      topics: {
        "Industrial Revolution": [
          "Causes and inventions",
          "Social changes and urbanisation",
        ],
        "Colonisation of the Cape": [
          "Dutch and British arrival",
          "Impact on indigenous societies",
        ],
        "Slavery at the Cape": [
          "Slave trade routes",
          "Life of slaves and abolition",
        ],
      },
    },
    9: {
      topics: {
        "World War II": ["Causes and key events", "Impact on civilians"],
        "Cold War & Nuclear Age": [
          "Origins of the Cold War",
          "Arms race and crises",
        ],
        "South Africa 1948–1994 (overview)": [
          "Apartheid foundations",
          "Resistance movements (overview)",
        ],
      },
    },
    10: {
      topics: {
        "World around 1600": ["Ming China", "Mughal India", "Songhai"],
        "European expansion": [
          "Portugal & Spain",
          "Impact on indigenous societies",
        ],
        "SA Transformations (1750–1850)": ["Economy and society"],
      },
    },
    11: {
      topics: {
        Nationalisms: ["Case studies (Germany/Italy/Africa)"],
        "Apartheid SA (1948–c.1976)": [
          "Institutionalised segregation",
          "Resistance movements",
        ],
        "Independent Africa": ["Challenges & successes"],
      },
    },
  },

  "Life Sciences": {
    10: {
      topics: {
        "Molecular/Cell/Tissue": ["Cells & organelles", "Mitosis"],
        "Plant & Animal Processes": [
          "Transport systems",
          "Gas exchange (intro)",
        ],
        "Environmental Studies": [
          "Biosphere & ecosystems",
          "Human impact (intro)",
        ],
      },
    },
    11: {
      topics: {
        "Molecular/Cell/Tissue": [
          "Meiosis & gametogenesis",
          "DNA & protein synthesis (intro)",
        ],
        "Plant & Animal Processes": [
          "Homeostasis (intro)",
          "Excretion & osmoregulation (intro)",
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

/**
 * Subject Knowledge Database
 * GOAT Bot 2.0
 * Updated: 2025-08-25 10:05:23 UTC
 * Developer: DithetoMokgabudi
 */

// Subject availability status
const SUBJECT_STATUS = {
  MATHEMATICS: {
    available: true,
    name: "Mathematics",
    alias: ["math", "maths", "mathematics"],
  },
  MATHEMATICAL_LITERACY: {
    available: true,
    name: "Mathematical Literacy",
    alias: ["maths lit", "math lit", "mathematical literacy", "mlit"],
  },
  PHYSICAL_SCIENCES: {
    available: true,
    name: "Physical Sciences",
    alias: ["physics", "physical", "chemistry", "physical sciences", "science"],
  },
  LIFE_SCIENCES: {
    available: true,
    name: "Life Sciences",
    alias: ["biology", "life", "life sciences"],
  },
  ENGLISH: {
    available: true,
    name: "English",
    alias: ["english", "english home", "english fal"],
  },
  GEOGRAPHY: {
    available: true,
    name: "Geography",
    alias: ["geography", "geo", "geog"],
  },
  HISTORY: {
    available: true,
    name: "History",
    alias: ["history", "hist"],
  },
  ECONOMICS: {
    available: true,
    name: "Economics",
    alias: ["economics", "eco", "econ"],
  },
  ACCOUNTING: {
    available: true,
    name: "Accounting",
    alias: ["accounting", "acc"],
  },
  BUSINESS_STUDIES: {
    available: true,
    name: "Business Studies",
    alias: ["business", "business studies", "bs"],
  },
};

// Dynamic knowledge base - Enhanced with CAPS curriculum topics
const SUBJECT_PROBING_DATABASE = {
  Mathematics: {
    algebra: {
      examples: [
        "Solving equations (like 2x + 5 = 15)",
        "Factoring expressions (like x² + 5x + 6)",
        "Simplifying expressions (like 3x + 2x)",
        "Substitution (plugging numbers into formulas)",
      ],
      common_struggles: [
        "I don't know which method to use",
        "I get confused with the steps",
        "I make calculation mistakes",
        "I don't understand what X means",
      ],
      diagnostic_question: {
        questionText:
          "Solve for x: 2x + 7 = 19\n\nShow all your working steps.",
        solution:
          "**Step 1:** Subtract 7 from both sides\n2x = 12\n\n**Step 2:** Divide both sides by 2\nx = 6\n\n**Therefore:** x = 6",
        purpose: "Basic equation solving",
      },
    },
    geometry: {
      examples: [
        "Circle theorems",
        "Triangle properties",
        "Euclidean geometry proofs",
        "Coordinate geometry",
      ],
      common_struggles: [
        "I can't visualize the shapes",
        "I don't know which theorem to apply",
        "I struggle with proofs",
        "I confuse different properties",
      ],
      diagnostic_question: {
        questionText:
          "In a circle with center O, AB is a diameter. If point C lies on the circle, prove that angle ACB is 90°.",
        solution:
          "**Given:** AB is a diameter of the circle with center O\nPoint C lies on the circle\n\n**To Prove:** Angle ACB = 90°\n\n**Proof:**\nOA = OC = OB (radii of the circle)\nTriangle AOC is isosceles (two sides equal)\nSimilarly, triangle BOC is isosceles\nIn triangle AOC: angle OAC = angle OCA\nIn triangle BOC: angle OBC = angle OCB\nAngle ACB = angle OCA + angle OCB\nAngle ACB = angle OAC + angle OBC\nIn triangle AOB, angles OAB + OBA + AOB = 180° (angle sum in triangle)\nSince AB is a diameter, angle AOB = 180°\nTherefore, angles OAB + OBA = 0°\nTherefore, angle ACB = 90°",
        purpose: "Circle theorem application",
      },
    },
    trigonometry: {
      examples: [
        "Using sin, cos, and tan",
        "Solving for angles in triangles",
        "Using the sine and cosine rules",
        "Graphing trigonometric functions",
      ],
      common_struggles: [
        "I forget which ratio to use",
        "I struggle with the unit circle",
        "The formulas confuse me",
        "I can't solve equations with trig functions",
      ],
      diagnostic_question: {
        questionText:
          "Find all solutions to the equation sin(x) = 0.5 for 0° ≤ x < 360°.",
        solution:
          "**Step 1:** We know that sin(x) = 0.5 means x = 30° or x = 150° in the first period\n\n**Step 2:** For the range 0° ≤ x < 360°, we need to find all solutions\nsin(x) = sin(x + 360°)\nSo, x = 30° or x = 150° or x = 30° + 360° or x = 150° + 360°\n\n**Step 3:** Filtering values in our range:\nx = 30° or x = 150° or x = 390° or x = 510°\n\n**Step 4:** Only keeping values in range 0° ≤ x < 360°:\nx = 30° or x = 150°\n\n**Therefore:** x = 30° or x = 150°",
        purpose: "Solving trigonometric equations",
      },
    },
    functions: {
      examples: [
        "Graphing linear functions",
        "Parabolas and other functions",
        "Finding domain and range",
        "Transformations of functions",
      ],
      common_struggles: [
        "I don't know how to sketch the graph",
        "I can't find intercepts",
        "I struggle with transformations",
        "I don't understand domain and range",
      ],
      diagnostic_question: {
        questionText:
          "Sketch the graph of f(x) = x² - 4 and show all key points.",
        solution:
          "**Step 1:** Identify the parent function: f(x) = x²\n\n**Step 2:** Identify the transformation: Shifted down by 4 units\n\n**Step 3:** Find key points:\nVertex: (0, -4) [Substituting x = 0 into f(x) = x² - 4]\nY-intercept: -4 [When x = 0, f(0) = -4]\nX-intercepts: Set f(x) = 0\nx² - 4 = 0\nx² = 4\nx = ±2\nSo x = 2 or x = -2\n\n**Step 4:** Draw the parabola through these points opening upward with vertex at (0, -4).",
        purpose: "Function transformation",
      },
    },
  },
  "Mathematical Literacy": {
    finance: {
      examples: [
        "Calculating interest on loans",
        "Creating and managing budgets",
        "Understanding tax calculations",
        "Working with exchange rates",
      ],
      common_struggles: [
        "I mix up simple and compound interest",
        "I don't know when to use which formula",
        "The percentages confuse me",
        "I don't understand financial terminology",
      ],
      diagnostic_question: {
        questionText:
          "Thabo deposits R5000 in a savings account with 7.5% simple interest per year. How much money will he have after 3 years?",
        solution:
          "**Step 1:** Identify the formula for simple interest\nA = P(1 + rt) where A is final amount, P is principal, r is interest rate, t is time\n\n**Step 2:** Substitute the values\nP = R5000\nr = 7.5% = 0.075\nt = 3 years\n\n**Step 3:** Calculate the final amount\nA = 5000(1 + 0.075 × 3)\nA = 5000(1 + 0.225)\nA = 5000 × 1.225\nA = R6125\n\n**Therefore:** Thabo will have R6125 after 3 years.",
        purpose: "Simple interest calculation",
      },
    },
    measurement: {
      examples: [
        "Converting between units",
        "Calculating area and volume",
        "Working with scales and maps",
        "Measuring time and distance",
      ],
      common_struggles: [
        "I forget the conversion factors",
        "I use the wrong formula for area/volume",
        "I can't interpret scale drawings",
        "I make calculation errors",
      ],
      diagnostic_question: {
        questionText:
          "A rectangular garden is 12.5m long and 8.75m wide. Calculate the area of the garden in square meters and the amount of fencing needed to surround it.",
        solution:
          "**Step 1:** Calculate the area using the formula Area = length × width\nArea = 12.5m × 8.75m = 109.375 m²\n\n**Step 2:** Calculate the perimeter for the fencing\nPerimeter = 2 × (length + width)\nPerimeter = 2 × (12.5m + 8.75m)\nPerimeter = 2 × 21.25m\nPerimeter = 42.5m\n\n**Therefore:** The area is 109.375 m² and 42.5m of fencing is needed.",
        purpose: "Area and perimeter calculation",
      },
    },
    data: {
      examples: [
        "Creating and interpreting graphs",
        "Calculating averages",
        "Analyzing data trends",
        "Using data to make decisions",
      ],
      common_struggles: [
        "I don't know which graph to use",
        "I confuse mean, median and mode",
        "I can't interpret the data properly",
        "I struggle with calculating percentages",
      ],
      diagnostic_question: {
        questionText:
          "The following marks were obtained by 7 students in a test: 65%, 72%, 48%, 72%, 81%, 59%, 72%. Calculate the mean, median and mode of these marks.",
        solution:
          "**Step 1:** Calculate the mean (average)\nMean = Sum of all marks ÷ Number of marks\nMean = (65 + 72 + 48 + 72 + 81 + 59 + 72) ÷ 7\nMean = 469 ÷ 7\nMean = 67%\n\n**Step 2:** Find the median (middle value when arranged in order)\nArranging in order: 48%, 59%, 65%, 72%, 72%, 72%, 81%\nMiddle value (4th out of 7): 72%\n\n**Step 3:** Find the mode (most common value)\nThe mark 72% appears three times, and all other marks appear once.\nMode = 72%\n\n**Therefore:** Mean = 67%, Median = 72%, Mode = 72%",
        purpose: "Statistical measures calculation",
      },
    },
  },
  Geography: {
    mapwork: {
      examples: [
        "Reading topographic maps",
        "Calculating distance and area",
        "Interpreting contour lines",
        "Using map coordinates",
      ],
      common_struggles: [
        "I can't visualize the landscape from contours",
        "I struggle with scale calculations",
        "Grid references confuse me",
        "I don't understand the symbols",
      ],
      diagnostic_question: {
        questionText:
          "On a 1:50 000 topographic map, two points are 6cm apart. What is the actual distance between these points in kilometers?",
        solution:
          "**Step 1:** Understand the scale - 1:50 000 means 1cm on map = 50 000cm in reality\n\n**Step 2:** Calculate the real distance\nReal distance = 6cm × 50 000 = 300 000cm\n\n**Step 3:** Convert to kilometers\n300 000cm = 3000m = 3km\n\n**Therefore:** The actual distance is 3km.",
        purpose: "Map scale calculation",
      },
    },
    climate: {
      examples: [
        "Understanding weather patterns",
        "Interpreting climate graphs",
        "Analyzing climate change",
        "Weather systems and forecasting",
      ],
      common_struggles: [
        "I can't interpret synoptic weather maps",
        "Climate graphs confuse me",
        "I struggle with pressure systems",
        "I don't understand climate classifications",
      ],
      diagnostic_question: {
        questionText:
          "Explain the difference between weather and climate, and describe how South Africa's location affects its climate zones.",
        solution:
          "**Weather vs Climate:**\nWeather refers to day-to-day atmospheric conditions (temperature, rainfall, wind) in a specific place over a short period.\nClimate refers to the average weather patterns in a region over long periods (usually 30+ years).\n\n**South Africa's Climate Zones:**\nSouth Africa's location between 22°S and 35°S places it in the subtropical belt.\nThe country has varied climate zones due to:\n1. Coastal location with warm Mozambique current on east coast and cold Benguela current on west coast\n2. Elevation changes from coast to interior plateau\n3. Presence of mountain ranges like the Drakensberg\n\nThis creates several distinct climate regions:\n- Mediterranean climate in Western Cape (winter rainfall)\n- Subtropical coastal climate in KwaZulu-Natal (summer rainfall)\n- Arid climate in Northern Cape\n- Temperate climate in central plateau\n\nThese variations explain why Cape Town and Durban experience completely different rainfall seasons despite both being coastal cities.",
        purpose: "Climate concepts understanding",
      },
    },
    settlement: {
      examples: [
        "Urban settlement patterns",
        "Rural development issues",
        "Urban hierarchies",
        "Settlement functions",
      ],
      common_struggles: [
        "I can't identify settlement patterns",
        "Urban models confuse me",
        "I struggle with development terminology",
        "I don't understand urban issues",
      ],
      diagnostic_question: {
        questionText:
          "Describe THREE factors that influenced the location of Johannesburg as a settlement, and explain how its function has changed over time.",
        solution:
          "**Factors influencing Johannesburg's location:**\n\n1. **Mineral resources:** Discovery of gold on the Witwatersrand ridge in 1886 was the primary factor in establishing Johannesburg\n\n2. **Topography:** The relatively flat high plateau provided suitable land for development and expansion\n\n3. **Water availability:** Despite not being located on a major river, the area had sufficient groundwater resources for initial settlement needs\n\n**Changes in function over time:**\n\n**Early phase (1886-1900s):** Mining camp and extraction economy focused solely on gold mining\n\n**Middle phase (1900s-1970s):** Industrial center with manufacturing developing alongside mining, becoming South Africa's economic hub\n\n**Recent phase (1970s-present):** Post-industrial city with diversified economy focusing on financial services, commerce, and tertiary sectors while mining diminished in importance\n\nJohannesburg has transformed from a single-function mining settlement to a multi-functional metropolitan area serving as South Africa's economic center and a global city in Africa.",
        purpose: "Settlement geography analysis",
      },
    },
  },
  History: {
    southAfrica: {
      examples: [
        "Apartheid and resistance",
        "The road to democracy",
        "Colonial history",
        "Post-1994 South Africa",
      ],
      common_struggles: [
        "I mix up chronological events",
        "I can't analyze source material properly",
        "I struggle with historical arguments",
        "I don't understand historical concepts",
      ],
      diagnostic_question: {
        questionText:
          "Evaluate the significance of the 1976 Soweto Uprising in the struggle against apartheid.",
        solution:
          "**Significance of the 1976 Soweto Uprising:**\n\n**Short-term impact:**\n- Immediate international attention and condemnation of apartheid\n- Brutal government response resulted in hundreds of deaths\n- Spread of protests throughout South Africa\n- Increased state repression and declaration of emergency\n\n**Medium-term impact:**\n- Rejuvenated anti-apartheid resistance after the banning of the ANC and PAC\n- Many students fled into exile and joined liberation movements\n- International sanctions intensified\n- Rise of Black Consciousness Movement and student activism\n\n**Long-term significance:**\n- Marked a turning point in resistance strategy from petition to direct confrontation\n- Changed international perception of apartheid regime\n- Created a new generation of politically active youth\n- Demonstrated the power of youth and student movements\n- Ultimately contributed to the apartheid government's eventual willingness to negotiate\n\nThe uprising demonstrated that apartheid's policy of separate development was unsustainable and revealed the regime's vulnerability to mass resistance, marking a critical juncture in South Africa's struggle for democracy.",
        purpose: "Historical significance evaluation",
      },
    },
    worldHistory: {
      examples: [
        "Cold War dynamics",
        "Crisis of capitalism",
        "Independence movements",
        "Civil society protests",
      ],
      common_struggles: [
        "I struggle with global perspectives",
        "I can't link events across regions",
        "The Cold War concepts confuse me",
        "I don't understand ideological terms",
      ],
      diagnostic_question: {
        questionText:
          "Explain how the Cold War influenced independence movements in Africa between 1960 and 1990.",
        solution:
          "**Cold War Influence on African Independence Movements (1960-1990):**\n\n**Ideological competition:**\n- Both superpowers (USA and USSR) competed for influence in newly independent African states\n- African leaders often played superpowers against each other to gain aid and support\n- Different movements adopted capitalist or socialist rhetoric to gain international backing\n\n**Direct involvement:**\n- Angola: MPLA (Soviet-backed) vs UNITA (US-backed) in civil war after independence\n- Congo Crisis: CIA involvement in Lumumba's assassination due to fear of Soviet influence\n- Ethiopia/Somalia conflict: Soviets switching support between the two countries\n\n**Impact on decolonization:**\n- Accelerated timeline as colonial powers (especially Britain and France) sought to maintain Western influence\n- Creation of neo-colonial relationships as former colonial powers maintained economic control\n- Soviet Union positioned itself as natural ally of anti-colonial movements\n\n**Long-term consequences:**\n- Many African states suffered proxy wars and instability\n- Economic development subordinated to Cold War geopolitics\n- African nationalism often became entangled with Cold War ideologies\n- End of Cold War led to abandonment of many African regimes by former superpower patrons\n\nThe Cold War both helped and hindered African independence - providing external support for liberation movements but often compromising genuine independence through superpower interference and manipulation.",
        purpose: "Global historical connections",
      },
    },
  },
};

// Subject availability checker
function checkSubjectAvailability(subjectInput) {
  const input = subjectInput.toLowerCase();

  for (const [key, subject] of Object.entries(SUBJECT_STATUS)) {
    for (const alias of subject.alias) {
      if (input.includes(alias)) {
        return {
          detected: subject.name,
          available: subject.available,
          coming_soon: subject.coming_soon || false,
          key: key,
        };
      }
    }
  }

  return {
    detected: "Mathematics",
    available: true,
    coming_soon: false,
    key: "MATHEMATICS",
  };
}

module.exports = {
  SUBJECT_STATUS,
  SUBJECT_PROBING_DATABASE,
  checkSubjectAvailability,
};

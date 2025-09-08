# Quantum TSP Solver using QAOA

This project implements a Quantum Approximate Optimization Algorithm (QAOA) to solve the Traveling Salesman Problem (TSP) using IBM Quantum services.

## Setup Instructions

1. **Get IBM Quantum API Token**
   - Create account at https://quantum-computing.ibm.com/
   - Copy your API token from account settings

2. **Install Dependencies**
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

3. **Configure Authentication**
   - Option 1: Set environment variable
     \`\`\`bash
     export IBM_QUANTUM_TOKEN="your_token_here"
     \`\`\`
   - Option 2: Create `ibm_token.txt` file with your token

4. **Run the Solver**
   \`\`\`bash
   python scripts/optimal_route_qaoa.py
   \`\`\`

5. **Compare with Classical Solution**
   \`\`\`bash
   python scripts/classical_tsp_comparison.py
   \`\`\`

## Problem Description

The solver finds the optimal route visiting nodes A, B, C, D exactly once with these edge weights:
- A ↔ B: 1
- A → C: 4  
- B ↔ C: 1
- B → D: 2
- C → D: 3

## How It Works

1. **Problem Encoding**: Maps TSP to quantum Hamiltonian with cost and constraint terms
2. **QAOA Circuit**: Creates parameterized quantum circuit with problem and mixer layers
3. **Optimization**: Uses parameter sweep to find optimal quantum state
4. **Measurement**: Extracts classical tour from quantum measurement results

The quantum approach explores multiple tour possibilities simultaneously, potentially finding optimal solutions more efficiently than classical methods for larger graphs.

"""
Quantum Traveling Salesman Problem Solver using QAOA
Solves optimal route detection for a 4-node graph using IBM Quantum services
"""

import os
import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit import Parameter
from qiskit_ibm_runtime import QiskitRuntimeService, Sampler
from qiskit.quantum_info import SparsePauliOp
from scipy.optimize import minimize
import itertools

class QuantumTSPSolver:
    def __init__(self):
        """Initialize the quantum TSP solver with graph definition"""
        # Define the graph: nodes A, B, C, D (represented as 0, 1, 2, 3)
        self.nodes = ['A', 'B', 'C', 'D']
        self.n_nodes = len(self.nodes)
        
        # Define edge weights as adjacency matrix
        # (A, B): 1, (A, C): 4, (B, D): 2, (C, D): 3, (B, C): 1
        self.weights = np.array([
            [0, 1, 4, np.inf],  # A to [A, B, C, D]
            [1, 0, 1, 2],       # B to [A, B, C, D]
            [4, 1, 0, 3],       # C to [A, B, C, D]
            [np.inf, 2, 3, 0]   # D to [A, B, C, D]
        ])
        
        # Number of qubits needed (one per node per position)
        self.n_qubits = self.n_nodes * self.n_nodes
        
        print(f"Graph initialized with {self.n_nodes} nodes")
        print("Edge weights:")
        for i, node_i in enumerate(self.nodes):
            for j, node_j in enumerate(self.nodes):
                if i != j and self.weights[i][j] != np.inf:
                    print(f"  {node_i} -> {node_j}: {self.weights[i][j]}")

    def setup_ibm_quantum(self):
        """Setup IBM Quantum service authentication"""
        try:
            # Try to load token from environment variable first
            token = os.getenv('IBM_QUANTUM_TOKEN')
            
            # If not found, try to load from file
            if not token:
                try:
                    with open('ibm_token.txt', 'r') as f:
                        token = f.read().strip()
                except FileNotFoundError:
                    print("Error: IBM Quantum token not found!")
                    print("Please either:")
                    print("1. Set IBM_QUANTUM_TOKEN environment variable")
                    print("2. Create 'ibm_token.txt' file with your token")
                    return None
            
            # Initialize the service
            service = QiskitRuntimeService(channel="ibm_quantum", token=token)
            print("Successfully connected to IBM Quantum services")
            return service
            
        except Exception as e:
            print(f"Error connecting to IBM Quantum: {e}")
            return None

    def create_tsp_hamiltonian(self):
        """Create the Hamiltonian for the TSP problem"""
        print("Creating TSP Hamiltonian...")
        
        # Initialize Pauli operators list
        pauli_list = []
        
        # Cost Hamiltonian: minimize total travel distance
        for i in range(self.n_nodes):
            for j in range(self.n_nodes):
                if i != j and self.weights[i][j] != np.inf:
                    weight = self.weights[i][j]
                    # For each position in the tour
                    for pos in range(self.n_nodes):
                        next_pos = (pos + 1) % self.n_nodes
                        
                        # Qubit indices for node i at position pos and node j at next position
                        qubit_i = i * self.n_nodes + pos
                        qubit_j = j * self.n_nodes + next_pos
                        
                        # Create Pauli string for this edge
                        pauli_str = ['I'] * self.n_qubits
                        pauli_str[qubit_i] = 'Z'
                        pauli_str[qubit_j] = 'Z'
                        
                        # Add to Hamiltonian (coefficient is positive for minimization)
                        pauli_list.append((''.join(pauli_str), weight / 4))

        # Constraint 1: Each node appears exactly once in the tour
        penalty_strength = 10
        for node in range(self.n_nodes):
            # Sum over all positions for this node should equal 1
            for pos1 in range(self.n_nodes):
                for pos2 in range(pos1 + 1, self.n_nodes):
                    qubit1 = node * self.n_nodes + pos1
                    qubit2 = node * self.n_nodes + pos2
                    
                    pauli_str = ['I'] * self.n_qubits
                    pauli_str[qubit1] = 'Z'
                    pauli_str[qubit2] = 'Z'
                    
                    pauli_list.append((''.join(pauli_str), penalty_strength))

        # Constraint 2: Each position has exactly one node
        for pos in range(self.n_nodes):
            for node1 in range(self.n_nodes):
                for node2 in range(node1 + 1, self.n_nodes):
                    qubit1 = node1 * self.n_nodes + pos
                    qubit2 = node2 * self.n_nodes + pos
                    
                    pauli_str = ['I'] * self.n_qubits
                    pauli_str[qubit1] = 'Z'
                    pauli_str[qubit2] = 'Z'
                    
                    pauli_list.append((''.join(pauli_str), penalty_strength))

        # Convert to SparsePauliOp
        hamiltonian = SparsePauliOp.from_list(pauli_list)
        print(f"Hamiltonian created with {len(pauli_list)} terms")
        return hamiltonian

    def create_qaoa_circuit(self, hamiltonian, p_layers=1):
        """Create QAOA circuit for the TSP Hamiltonian"""
        print(f"Creating QAOA circuit with {p_layers} layers...")
        
        # Parameters for QAOA
        beta = [Parameter(f'β_{i}') for i in range(p_layers)]
        gamma = [Parameter(f'γ_{i}') for i in range(p_layers)]
        
        # Initialize circuit
        qc = QuantumCircuit(self.n_qubits)
        
        # Initial state: equal superposition
        qc.h(range(self.n_qubits))
        
        # QAOA layers
        for layer in range(p_layers):
            # Problem Hamiltonian evolution
            qc.append(hamiltonian.evolve(gamma[layer]), range(self.n_qubits))
            
            # Mixer Hamiltonian (X rotations)
            for qubit in range(self.n_qubits):
                qc.rx(2 * beta[layer], qubit)
        
        # Measurements
        qc.measure_all()
        
        print(f"QAOA circuit created with {qc.num_qubits} qubits and depth {qc.depth()}")
        return qc, beta + gamma

    def decode_bitstring(self, bitstring):
        """Decode measurement bitstring to tour representation"""
        # Convert bitstring to matrix representation
        assignment = np.array([int(b) for b in bitstring]).reshape(self.n_nodes, self.n_nodes)
        
        # Extract tour if valid
        tour = []
        for pos in range(self.n_nodes):
            nodes_at_pos = np.where(assignment[:, pos] == 1)[0]
            if len(nodes_at_pos) == 1:
                tour.append(nodes_at_pos[0])
            else:
                return None, float('inf')  # Invalid assignment
        
        # Check if all nodes are visited exactly once
        if len(set(tour)) != self.n_nodes:
            return None, float('inf')
        
        # Calculate tour cost
        cost = 0
        for i in range(self.n_nodes):
            current_node = tour[i]
            next_node = tour[(i + 1) % self.n_nodes]
            if self.weights[current_node][next_node] == np.inf:
                return None, float('inf')
            cost += self.weights[current_node][next_node]
        
        # Convert to node names
        tour_names = [self.nodes[i] for i in tour]
        return tour_names, cost

    def objective_function(self, params, circuit, hamiltonian, sampler):
        """Objective function for classical optimization"""
        # Bind parameters to circuit
        bound_circuit = circuit.bind_parameters(params)
        
        # Execute circuit
        job = sampler.run([bound_circuit], shots=1024)
        result = job.result()
        
        # Calculate expectation value
        counts = result[0].data.meas.get_counts()
        expectation = 0
        total_shots = sum(counts.values())
        
        for bitstring, count in counts.items():
            probability = count / total_shots
            # Calculate energy for this bitstring
            energy = self.calculate_energy(bitstring, hamiltonian)
            expectation += probability * energy
        
        return expectation

    def calculate_energy(self, bitstring, hamiltonian):
        """Calculate energy of a bitstring given the Hamiltonian"""
        # This is a simplified energy calculation
        # In practice, you'd evaluate the Hamiltonian on the state
        tour, cost = self.decode_bitstring(bitstring)
        if tour is None:
            return 1000  # High penalty for invalid tours
        return cost

    def solve_tsp(self):
        """Main method to solve TSP using QAOA"""
        print("Starting Quantum TSP Solver...")
        
        # Setup IBM Quantum service
        service = self.setup_ibm_quantum()
        if service is None:
            return None, None
        
        # Create Hamiltonian
        hamiltonian = self.create_tsp_hamiltonian()
        
        # Create QAOA circuit
        circuit, parameters = self.create_qaoa_circuit(hamiltonian, p_layers=1)
        
        # Get sampler (using simulator for reliability)
        sampler = Sampler(backend="ibm_qasm_simulator")
        
        print("Running QAOA optimization...")
        
        # Simple parameter sweep instead of complex optimization
        best_cost = float('inf')
        best_tour = None
        best_params = None
        
        # Try different parameter combinations
        for gamma_val in np.linspace(0, np.pi, 5):
            for beta_val in np.linspace(0, np.pi/2, 5):
                params = [beta_val, gamma_val]
                
                try:
                    # Bind parameters and run
                    bound_circuit = circuit.bind_parameters(params)
                    job = sampler.run([bound_circuit], shots=1024)
                    result = job.result()
                    
                    # Analyze results
                    counts = result[0].data.meas.get_counts()
                    
                    # Find best valid tour from measurements
                    for bitstring, count in counts.items():
                        tour, cost = self.decode_bitstring(bitstring)
                        if tour is not None and cost < best_cost:
                            best_cost = cost
                            best_tour = tour
                            best_params = params
                            
                except Exception as e:
                    print(f"Error with parameters γ={gamma_val:.2f}, β={beta_val:.2f}: {e}")
                    continue
        
        return best_tour, best_cost

def main():
    """Main execution function"""
    print("=" * 60)
    print("Quantum Traveling Salesman Problem Solver")
    print("Using QAOA on IBM Quantum Platform")
    print("=" * 60)
    
    # Create solver instance
    solver = QuantumTSPSolver()
    
    # Solve the TSP
    optimal_tour, optimal_cost = solver.solve_tsp()
    
    # Display results
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    
    if optimal_tour is not None:
        print(f"Optimal Route Found: {' -> '.join(optimal_tour)} -> {optimal_tour[0]}")
        print(f"Total Cost: {optimal_cost}")
        
        # Show the path step by step
        print("\nRoute Details:")
        for i in range(len(optimal_tour)):
            current = optimal_tour[i]
            next_node = optimal_tour[(i + 1) % len(optimal_tour)]
            current_idx = solver.nodes.index(current)
            next_idx = solver.nodes.index(next_node)
            edge_cost = solver.weights[current_idx][next_idx]
            print(f"  {current} -> {next_node}: cost {edge_cost}")
    else:
        print("No valid tour found. This might be due to:")
        print("- Insufficient quantum circuit depth")
        print("- Need for better parameter optimization")
        print("- Quantum noise in the simulation")
        
        # Show classical solution for comparison
        print("\nClassical brute-force solution:")
        solver.find_classical_solution()

if __name__ == "__main__":
    main()

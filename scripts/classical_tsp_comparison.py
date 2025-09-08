"""
Classical TSP solver for comparison with quantum results
"""

import itertools
import numpy as np

def solve_tsp_classical():
    """Solve TSP using brute force for comparison"""
    nodes = ['A', 'B', 'C', 'D']
    weights = np.array([
        [0, 1, 4, np.inf],  # A to [A, B, C, D]
        [1, 0, 1, 2],       # B to [A, B, C, D]
        [4, 1, 0, 3],       # C to [A, B, C, D]
        [np.inf, 2, 3, 0]   # D to [A, B, C, D]
    ])
    
    best_cost = float('inf')
    best_tour = None
    
    # Try all possible permutations starting from A
    for perm in itertools.permutations(range(1, len(nodes))):
        tour = [0] + list(perm)  # Start from A (index 0)
        
        # Calculate cost
        cost = 0
        valid = True
        for i in range(len(tour)):
            current = tour[i]
            next_node = tour[(i + 1) % len(tour)]
            if weights[current][next_node] == np.inf:
                valid = False
                break
            cost += weights[current][next_node]
        
        if valid and cost < best_cost:
            best_cost = cost
            best_tour = [nodes[i] for i in tour]
    
    print("Classical Solution:")
    print(f"Optimal Route: {' -> '.join(best_tour)} -> {best_tour[0]}")
    print(f"Total Cost: {best_cost}")
    
    return best_tour, best_cost

if __name__ == "__main__":
    solve_tsp_classical()

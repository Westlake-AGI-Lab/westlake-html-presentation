"""Offline quiz bank for the linear algebra lecture; not AI-generated assessment."""

BANK = [
    dict(page=5, question='Which condition is required for v to be an eigenvector?',
         options=['v is nonzero and Av is a scalar multiple of v', 'v must have length one',
                  'The eigenvalue must be positive', 'A must be invertible'], correct=0,
         explanation='An eigenvector is nonzero and satisfies Av = lambda v. The eigenvalue may be zero or negative.'),
    dict(page=9, question='P projects onto span(4,3). What is P(-3,4)?',
         options=['(-3,4)', '(0,0)', '(4,3)', '(3,-4)'], correct=1,
         explanation='(-3,4) is perpendicular to (4,3): their dot product is zero. Projection sends it to zero.'),
    dict(page=9, question='What are the eigenvalues of projection onto a line in the plane?',
         options=['1 and -1', '0 and 0', '1 and 0', '2 and 1'], correct=2,
         explanation='Vectors on the line are preserved (1). Perpendicular vectors are sent to zero (0).'),
    dict(page=10, question='Which statement about a 90-degree rotation in the real plane is correct?',
         options=['Every vector is an eigenvector', 'It has two independent real eigenvectors',
                  'Its only eigenvector is zero', 'It has no real eigenvectors'], correct=3,
         explanation='A quarter turn moves each nonzero vector off its line. The zero vector is excluded.'),
    dict(page=11, question='A nonzero vector v satisfies Av = 0. What follows?',
         options=['A is invertible', 'v is not an eigenvector',
                  'Zero is an eigenvalue and A is not invertible', 'All eigenvalues are zero'], correct=2,
         explanation='Av = 0v gives eigenvalue zero. A has a nontrivial kernel and is not invertible.'),
]

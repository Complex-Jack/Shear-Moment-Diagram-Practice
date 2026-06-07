# Shear-Moment Student Practice

Randomized beam cases with two or three pin/roller supports for checking student calculations.

Students receive three attempts to submit:

- left and right reactions,
- shear and bending moment at a marked station,
- maximum absolute bending moment and its location.

The shear and moment diagrams remain locked until the answers are correct or the third attempt is used.

Loads may include downward point forces, uniform distributed loads, and applied bending couples. Torsion is intentionally excluded.

Support locations are randomized and may create beam overhangs. Three-support cases provide one known reaction so the remaining reactions can be found using static equilibrium.

Run locally:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/shear-moment-student/
```

For GitHub Pages, commit this folder and open:

```text
https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/shear-moment-student/
```

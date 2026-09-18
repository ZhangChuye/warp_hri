# Human Perception of Whole-Body Robot Motion

Project website for our **CS 7633 (Fall 2026)** course project: a video-based user study comparing how people perceive robot motion retargeted with **WARP** and **Mink-based baselines**.

**Live site:** https://zhangchuye.github.io/warp_hri/

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Layout

```
index.html              single-page site
assets/css/style.css    styles
assets/js/main.js       sliding motivation cards, video autoplay in view, robot figure highlights
assets/img/             robot photo (WebP + JPEG), favicon, social preview
assets/video/           WARP vs. MINK comparison clip + poster
```

No build step: plain HTML, CSS, and JavaScript, served by GitHub Pages from the `main` branch.

## Credits

- The comparison clip comes from the [WARP project page](https://warp-retargeting.github.io/) ([paper](https://arxiv.org/abs/2606.29940)).
- The MINK baselines are built on [Mink](https://github.com/kevinzakka/mink).

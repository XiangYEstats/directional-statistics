"""Site content. Edit here, then run: python3 build.py"""

SITE = {
    "title": "Directional Statistics",
    "author": "Xiang Ye",
    "description": "Directional statistics: an introduction, Bayesian research, and Stan tutorials by Xiang Ye.",
    "email": "xiang.ye@kaust.edu.sa",
    "personal_site": "https://xiangyestats.github.io/XiangYe/",
    "github": "https://github.com/XiangYEstats",
    "package_repo": "https://github.com/XiangYEstats/INLAcircular",
    "scholar": "https://scholar.google.com/citations?user=08io_8cAAAAJ&hl=en&oi=sra",
    # Set this to the final public URL when publishing, including a repository
    # path if applicable. Relative links already work at any depth.
    "url": "",
}

# Only the three supplied documents. Dates are document dates, not publication
# claims. Source HTML is copied without modification.
TUTORIALS = [
    {
        "slug": "pc-prior",
        "title": "Penalized Complexity Priors for Circular Distributions",
        "menu_title": "PC priors for circular distributions",
        "category": "Priors",
        "implementation": "Stan",
        "summary": "Construct and calibrate PC priors for von Mises concentration, with circular-uniform and point-mass base models.",
        "filename": "pc_prior.html",
        "date": "2026-09-07",
        "display_date": "7 September 2026",
        "data_files": [],
    },
    {
        "slug": "lavm",
        "title": "Circular Distributions for Regression Models",
        "menu_title": "Circular regression with LAvM",
        "category": "Circular response",
        "implementation": "Stan",
        "summary": "Explore link-adjusted von Mises regression, from fixed effects to temporal structure and wind-direction data.",
        "filename": "lavm.html",
        "date": "2026-09-07",
        "display_date": "7 September 2026",
        "data_files": ["wind_data.rds"],
    },
    {
        "slug": "circular-joint-regression",
        "title": "Joint circular models",
        "menu_title": "Joint circular models",
        "category": "Circular covariate",
        "implementation": "Stan",
        "summary": "Explore regression models with circular covariates and learn how to extend them to joint modelling.",
        "filename": "circular_joint_regression.html",
        "date": "2026-09-07",
        "display_date": "7 September 2026",
        "data_files": ["wind_data.rds"],
    },
]

PAPERS = {
    "priors": {
        "title": "Penalizing complexity priors for Bayesian inference of circular models",
        "authors": "Ye, Van Niekerk & Rue (2026)",
        "url": "https://doi.org/10.1177/1471082X261453677",
    },
    "regression": {
        "title": "A Bayesian regression framework for circular models with INLA",
        "authors": "Ye, Van Niekerk & Rue (2026)",
        "url": "https://arxiv.org/abs/2602.08413",
    },
}

RESEARCH = [
    {
        "key": "priors",
        "label": "Priors",
        "symbol": "π(κ)",
        "title": "Priors for circular models",
        "summary": "Penalized complexity priors for the concentration of circular distributions.",
        "tutorial": "pc-prior",
        "paper": "priors",
        "eyebrow": "Bayesian research / Priors",
        "intro": "The concentration parameter controls how tightly a circular distribution gathers around its mean direction. A prior on that parameter expresses what we assume about directional variation before observing the data.",
        "heading": "Penalized complexity priors",
        "body": "Penalized complexity (PC) priors express a preference for a simpler base model and penalize departures from it. For von Mises concentration, two base models lead to different constructions: the circular uniform distribution and a point mass. Calibration through mean resultant length or angular spread makes the prior interpretable in terms of directional variation.",
        "notation": "κ ≥ 0",
        "notation_label": "Concentration parameter",
        "note": "For the von Mises distribution, κ = 0 gives a uniform circle; larger κ means stronger concentration around the mean direction.",
    },
    {
        "key": "circular-outcomes",
        "label": "Regression: circular response",
        "symbol": "Y ∈ S¹",
        "title": "Regression with a circular response",
        "summary": "Link-adjusted von Mises models for angular outcomes and structured predictors.",
        "tutorial": "lavm",
        "paper": "regression",
        "eyebrow": "Bayesian research / Circular response",
        "intro": "When the response is an angle, a regression model needs to respect the circle. For example, the outcome may be wind direction, while covariates and latent effects describe how that direction changes.",
        "heading": "Link-adjusted von Mises distribution",
        "body": "The link-adjusted von Mises (LAvM) distribution transforms a centred von Mises variable through a link adjustment. Its linear-scale parameter η changes both the location and shape of the circular density, while κ controls concentration in the underlying von Mises distribution. This provides a distributional basis for regression with a circular response; the accompanying tutorial develops its implementation in Stan.",
        "notation": "Y ∈ S¹",
        "notation_label": "The response is circular",
        "note": "The response lies on the circle. Covariates and latent effects enter a predictor that describes variation in its direction.",
    },
    {
        "key": "circular-predictors",
        "label": "Regression: circular covariate",
        "symbol": "(Y, θ)",
        "title": "Regression with a circular covariate",
        "summary": "Joint circular models connecting direction and a linear response through shared latent structure.",
        "tutorial": "circular-joint-regression",
        "paper": "regression",
        "eyebrow": "Bayesian research / Circular covariate",
        "intro": "An angle can also carry information about a linear response. Wind direction and wind speed provide one example. Their relationship must account for the fact that the angular coordinate repeats after a full turn.",
        "heading": "Joint circular models",
        "body": "A joint circular model treats the angular quantity as a response in its own right and links it to a linear response through a shared latent predictor. This represents their association while carrying uncertainty about the circular component into the joint analysis. Shared and response-specific AR(2) processes describe temporal variation, as illustrated by wind direction and speed.",
        "notation": "θ ∈ S¹, Y ∈ ℝ",
        "notation_label": "Circular and linear responses",
        "note": "Here, the circular covariate is modelled jointly with the linear response. Their association enters through shared latent structure.",
    },
]

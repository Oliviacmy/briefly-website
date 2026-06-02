/* Briefly landing page — interactions */

(function () {
  "use strict";

  /* ----------- Checkout form + Stripe Checkout -----------
     Pricing buttons open a form that collects subscriber details,
     then POSTs to a serverless endpoint that creates a Stripe
     Checkout subscription session and returns its URL.
  -------------------------------------------------------- */
  const CHECKOUT_API = "/api/create-checkout-session";

  const PLAN_LABELS = {
    monthly: "Monthly plan · HKD 29/month",
    yearly: "Yearly plan · HKD 252/year"
  };
  const EDUCATION_OPTIONS = [
    "Primary School",
    "Secondary School",
    "Bachelor's",
    "Postgraduate or above"
  ];

  const modal = document.getElementById("checkout-modal");
  const form = document.getElementById("checkout-form");
  const planLabel = document.getElementById("checkout-modal-plan");
  const planInput = document.getElementById("checkout-plan");
  const submitBtn = document.getElementById("checkout-submit");
  const formError = document.getElementById("checkout-form-error");

  let lastFocused = null;

  function showFieldError(name, message) {
    const span = form.querySelector('[data-error-for="' + name + '"]');
    const field = form.elements[name];
    if (span) span.textContent = message || "";
    if (field) {
      if (message) field.setAttribute("aria-invalid", "true");
      else field.removeAttribute("aria-invalid");
    }
  }

  function clearErrors() {
    ["name", "email", "age", "education"].forEach(function (n) {
      showFieldError(n, "");
    });
    formError.hidden = true;
    formError.textContent = "";
  }

  function validate(data) {
    let ok = true;
    if (!data.name || data.name.trim().length < 1) {
      showFieldError("name", "Please enter your name."); ok = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "")) {
      showFieldError("email", "Please enter a valid email address."); ok = false;
    }
    const age = Number(data.age);
    if (!Number.isFinite(age) || age < 13 || age > 120) {
      showFieldError("age", "Please enter an age between 13 and 120."); ok = false;
    }
    if (EDUCATION_OPTIONS.indexOf(data.education) === -1) {
      showFieldError("education", "Please select your education level."); ok = false;
    }
    return ok;
  }

  function openModal(plan) {
    if (!modal) return;
    const safePlan = PLAN_LABELS[plan] ? plan : "monthly";
    planInput.value = safePlan;
    planLabel.textContent = "You’re subscribing to the " + PLAN_LABELS[safePlan] + ".";
    clearErrors();
    lastFocused = document.activeElement;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    const firstField = document.getElementById("cf-name");
    if (firstField) firstField.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") closeModal();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearErrors();

    const data = {
      plan: planInput.value,
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      age: form.elements.age.value.trim(),
      education: form.elements.education.value
    };

    if (!validate(data)) return;

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Redirecting to secure checkout…";

    try {
      const res = await fetch(CHECKOUT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      let payload = {};
      try { payload = await res.json(); } catch (err) { /* ignore */ }

      if (!res.ok || !payload.url) {
        throw new Error(payload.error || "We couldn’t start checkout. Please try again.");
      }

      window.location.href = payload.url;
    } catch (err) {
      formError.textContent = err.message || "Something went wrong. Please try again.";
      formError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }

  function handleCheckout(e) {
    e.preventDefault();
    const plan = e.currentTarget.dataset.plan || "monthly";
    openModal(plan);
  }

  document
    .querySelectorAll(".stripe-checkout")
    .forEach(function (button) {
      button.addEventListener("click", handleCheckout);
    });

  if (modal) {
    modal.querySelectorAll("[data-close-modal]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
    if (form) form.addEventListener("submit", handleSubmit);
  }

  /* ----------- Reveal on scroll -----------
     Respects prefers-reduced-motion. If reduced motion or no
     IntersectionObserver, skips animation entirely.
  ----------------------------------------- */
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const revealTargets = document.querySelectorAll(
    ".section-head, .feature, .process-step, .sample-card, .diff-card, .who-card, .quote, .testers-card"
  );
  revealTargets.forEach(function (el) {
    el.classList.add("reveal");
  });

  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    // Activate the reveal styles only when JS + IO + motion are available.
    document.documentElement.classList.add("js-reveal");

    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach(function (el) { io.observe(el); });

    // Safety net: ensure everything reveals after 1.6s even if the
    // observer never fires (e.g. zero-height viewport in screenshot tools).
    setTimeout(function () {
      revealTargets.forEach(function (el) { el.classList.add("in"); });
    }, 1600);
  }
  // If reduced motion or no IO, .js-reveal is never added, so .reveal stays
  // visually neutral (no opacity:0). Content is fully visible by default.

  /* ----------- Smooth anchor focus (a11y) ----------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      const id = a.getAttribute("href");
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          // Smooth scroll is handled by CSS; move focus for screen readers.
          setTimeout(function () {
            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          }, 400);
        }
      }
    });
  });
})();

/* Briefly landing page — interactions */

(function () {
  "use strict";

  /* ----------- Stripe checkout -----------
     Routes each pricing button to its live Stripe payment link.
  ---------------------------------------- */
  const STRIPE_CHECKOUT_URLS = {
    monthly: "https://buy.stripe.com/dRmaEWbtlgyv9wY7QV2Fa02",
    yearly: "https://buy.stripe.com/00w5kC2WP6XV8sUc7b2Fa03"
  };

  function handleCheckout(e) {
    e.preventDefault();
    const button = e.currentTarget;
    const plan = button.dataset.plan || "monthly";
    const checkoutUrl = STRIPE_CHECKOUT_URLS[plan];

    if (!checkoutUrl || checkoutUrl.includes("STRIPE_")) {
      const originalText = button.textContent;
      button.textContent = "Stripe checkout is being connected";
      button.disabled = true;
      setTimeout(function () {
        button.textContent = originalText;
        button.disabled = false;
      }, 1800);
      return;
    }

    window.location.href = checkoutUrl;
  }

  document
    .querySelectorAll(".stripe-checkout")
    .forEach(function (button) {
      button.addEventListener("click", handleCheckout);
    });

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

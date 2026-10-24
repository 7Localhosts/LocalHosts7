(function attachPaymentButtonState(root) {
  const labels = Object.freeze({
    ready: "Pay securely with Paystack",
    connecting: "Connecting to Paystack…",
    verifying: "Verifying payment…",
    successful: "Payment successful",
    verificationFailed: "Pay securely with Paystack"
  });

  function buttonPresentation(state, canStartPayment) {
    if (state === "connecting" || state === "verifying") {
      return { label: labels[state], disabled: true };
    }
    if (state === "successful") {
      return { label: labels.successful, disabled: true };
    }
    if (state === "verificationFailed") {
      // On failure, this button retries verification for the URL reference.
      return { label: labels.verificationFailed, disabled: false };
    }
    return { label: labels.ready, disabled: !canStartPayment };
  }

  function actionForReference(reference) {
    return String(reference || "").trim() ? "verify" : "initialize";
  }

  const api = Object.freeze({ labels, buttonPresentation, actionForReference });
  root.KaysHavenCheckoutPaymentButtonState = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window === "undefined" ? globalThis : window);

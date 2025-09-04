// app/static/js/payment.js

document.addEventListener("DOMContentLoaded", () => {
  const unlockBtn = document.getElementById("unlockComparisonBtn");
  const overlay = document.getElementById("comparisonOverlay");

  if (unlockBtn && overlay) {
    unlockBtn.addEventListener("click", function(e) {
      const options = {
        key: "rzp_test_1DP5mmOlF5G5ag", // 🔑 Replace with your Razorpay Test Key ID
        amount: 10000,                 // paise = ₹100
        currency: "INR",
        name: "Repo Analyzer Demo",
        description: "Unlock Repository Comparison",
        handler: function (response) {
          alert("✅ Test Payment Success! Repository Comparison Unlocked.");
          overlay.style.display = "none"; // hide the paywall overlay
        },
        theme: { color: "#3399cc" }
      };

      const rzp = new Razorpay(options);
      rzp.open();
      e.preventDefault();
    });
  }
});

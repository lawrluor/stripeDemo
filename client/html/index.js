fetch('/config')
  .then(function (result) {
    return result.json();
  })
  .then(function (json) {
    window.config = json;
    window.stripe = Stripe(config.publicKey);
  });

var submitBtn = document.querySelector('#submit');
submitBtn.addEventListener('click', function (evt) {
  let donation = parseInt(document.querySelector('#donation').value)
  fetch('/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      totalCost: donation
    }),
  }).then(function (result) {
    return result.json();
  }).then(function (data) {
    stripe.redirectToCheckout({
      sessionId: data.sessionId,
    })
    .then(function(result) {
      if (result.error) {
        var displayError = document.getElementById('error-message');
        displayError.textContent = result.error.message;
      }
    });
  });
});

// React only display component if the data for it exists
// {jsonData && <Component jsonData={jsonData} }

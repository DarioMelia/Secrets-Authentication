let secrets = document.querySelectorAll(".secret");


AOS.init({
  easing: 'ease-in-sine'
});


secrets.forEach((secret) => {
  const randomTime = Math.floor(Math.random() * (550 - 150)) + 150;
  secret.setAttribute("data-aos-duration", randomTime.toString());

})

var prevScrollpos = window.pageYOffset;
window.onscroll = function() {
  var currentScrollPos = window.pageYOffset;
  if (prevScrollpos > currentScrollPos) {
    document.querySelector(".secrets__header").setAttribute("style","top:0");
  } else {
    document.querySelector(".secrets__header").setAttribute("style","top:-120px");
  }
  prevScrollpos = currentScrollPos;
}

window.addEventListener("load", function(event) {

  secrets.forEach((secret) => {
    setAtrs(secret);

    if (secret.textContent.length > 150) {
      secret.classList.add("secret--big");
    }

  })
  AOS.refresh();
});

window.onresize = function() {
  clearTimeout(window.resizedFinished);
  window.resizedFinished = setTimeout(function() {
    console.log('Resized finished.');
    secrets.forEach((secret) => {
      setAtrs(secret);
    })
    window.location.reload();
  }, 250);
};






function vw() {
  return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
}

function setAtrs(secret) {
  if (vw() < 530) {

    secret.setAttribute("data-aos", "fade-left");
    secret.setAttribute("data-aos-anchor-placement", "top-center");
    secret.setAttribute("data-aos-offset", "-100");

  } else if (vw() > 530) {
    secret.setAttribute("data-aos", "fade-up");
    secret.setAttribute("data-aos-offset", "200");


  }
};

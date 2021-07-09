let secrets = document.querySelectorAll(".secret");


AOS.init({
  easing: 'ease-in-sine'
});


secrets.forEach((secret) => {
  const randomTime = Math.floor(Math.random() * (550 - 150)) + 150;
  secret.setAttribute("data-aos-duration", randomTime.toString());

})


window.addEventListener("load", function(event) {

  secrets.forEach((secret) => {
    setAtrs(secret);

    if (secret.textContent.length > 150) {
      secret.classList.add("secret--big");
    }

  })
  AOS.refresh();
});




var prevScrollpos = window.pageYOffset;
window.onscroll = function() {
  var currentScrollPos = window.pageYOffset;

  if (prevScrollpos > currentScrollPos) {
    document.querySelector(".secrets__header").setAttribute("style","top:0");

    if(vw()>530){
      document.querySelector(".secrets__btns").setAttribute("style","bottom:-150px");
      document.querySelector(".secrets__btns .btn").setAttribute("style","opacity:0;")
    }

  } else {
    document.querySelector(".secrets__header").setAttribute("style","top:-120px");

    if(vw()>530){
      document.querySelector(".secrets__btns").setAttribute("style","bottom:0;");
      document.querySelector(".secrets__btns .btn").setAttribute("style","opacity:1;")
    }

  }
  prevScrollpos = currentScrollPos;
}




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

if(is_touch_enabled()){
  document.querySelectorAll(".btn--del").forEach((del)=>{
    del.setAttribute("style", "opacity:1");
  })
}







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

function is_touch_enabled() {
         return ( 'ontouchstart' in window ) ||
                ( navigator.maxTouchPoints > 0 ) ||
                ( navigator.msMaxTouchPoints > 0 );
     }

let secrets = document.querySelectorAll(".secret");
let overlay = document.querySelector(".secrets__overlay");


AOS.init({                         //Iniciamos la librería para las animaciones de scroll.
  easing: 'ease-in-sine'           //acepta paramaetros
});


secrets.forEach((secret) => {                                            //Asignamos una duración aleatorio a cada elemento del grid
  const randomTime = Math.floor(Math.random() * (550 - 150)) + 150;
  secret.setAttribute("data-aos-duration", randomTime.toString());

  secret.addEventListener("click", e => {
    var content = e.currentTarget.querySelector(".secret__content").textContent;
    let overlaySecret = document.querySelector(".secrets__overlay__secret");
    let overlayContent = document.querySelector(".overlay__content");
    overlayContent.textContent = content;
    if(overlay.classList.contains("overlay--close")){
      overlay.classList.remove("overlay--close");
    }
    overlay.classList.add("overlay--open");

    if(e.currentTarget.classList.contains("secret--own")){
      overlaySecret.classList.add("secret--own")
    }

  });

})

let overlayCloseBtn = document.querySelector(".overlay__btn-close");
overlayCloseBtn.addEventListener("click", e =>{
  overlayClose();
});

window.addEventListener("keydown", e =>{
  if(e.key === "Escape"){
  overlayClose();
  }
})


window.addEventListener("load", function(event) {

  secrets.forEach((secret) => {
    setAtrs(secret);                      //AOS recibe unos poarametros diferentes en función del tamaño de la pantalla

    if (secret.textContent.length > 150) {    //Y a los secretos más extensos añadimos una clase para hacerlos span-2
      secret.classList.add("secret--big");
    }

  })
  AOS.refresh();                           //Para actualizar los nuevos valores
});




var prevScrollpos = window.pageYOffset;
window.onscroll = function() {                            //Detectamos si se está scrolleando hacia arriba o abajo
  var currentScrollPos = window.pageYOffset;

  if (prevScrollpos > currentScrollPos) {                 //Si la posicion anteior es superior a la actual estamos subiendo
    document.querySelector(".secrets__header").setAttribute("style","top:0");     //mostramos el header

    if(vw()>530){                                                                        //En pantallas grandes escondemos el footer al subir
      document.querySelector(".secrets__btns").setAttribute("style","bottom:-150px");
      document.querySelector(".secrets__btns .btn").setAttribute("style","opacity:0;")
    }

  } else {
    document.querySelector(".secrets__header").setAttribute("style","top:-120px");       //Escondemos el header

    if(vw()>530){    //En pantallas grandes mostramos el footer al bajar
      document.querySelector(".secrets__btns").setAttribute("style","bottom:0;");
      document.querySelector(".secrets__btns .btn").setAttribute("style","opacity:1;")
    }

  }
  prevScrollpos = currentScrollPos;
}




window.onresize = function() {               //Al terminar un resize recargamos la página
  clearTimeout(window.resizedFinished);
  window.resizedFinished = setTimeout(function() {  //Cuando terine el resize cambiamos los parametros de Aos
    console.log('Resized finished.');
    secrets.forEach((secret) => {
      setAtrs(secret);
    })
    window.location.reload();                       //Recaregamos la página

  }, 250);
};

if(is_touch_enabled()){   //En las pantllas táctiles dondeno hay hover, mostramos el boton para borrar secretos constante
  document.querySelectorAll(".btn--del").forEach((del)=>{
    del.setAttribute("style", "opacity:1");
  })
}







function vw() {   //Saca el width de la pantalla
  return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
}

function setAtrs(secret) {
  if (vw() < 530) { //En pantallas pequeñas los elementos se animasn desde la derecha

    secret.setAttribute("data-aos", "fade-left");
    secret.setAttribute("data-aos-anchor-placement", "top-center");
    secret.setAttribute("data-aos-offset", "-100");

  } else if (vw() > 530) {  //En pantallas grandes desde abajo
    secret.setAttribute("data-aos", "fade-up");
    secret.setAttribute("data-aos-offset", "200");


  }
};

function is_touch_enabled() {  //buscamos si el dispoisitivo es táctil
         return ( 'ontouchstart' in window ) ||
                ( navigator.maxTouchPoints > 0 ) ||
                ( navigator.msMaxTouchPoints > 0 );
     }
function overlayClose(){
  overlay.classList.add("overlay--close");
  overlay.classList.remove("overlay--open");
  if(document.querySelector(".secrets__overlay__secret").classList.contains("secret--own")){
    document.querySelector(".secrets__overlay__secret").classList.remove("secret--own");
  }
}

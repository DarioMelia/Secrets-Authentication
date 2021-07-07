window.addEventListener("load", function(event) {
  let secrets = document.querySelectorAll(".secret");

  secrets.forEach((secret)=>{
    console.log(secret.textContent.length);
    if(secret.textContent.length > 150){
      secret.classList.add("secret--big");
    }
  })
});

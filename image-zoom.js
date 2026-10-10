const dialog = document.querySelector(".image-zoom-dialog");
const enlargedImage = dialog?.querySelector(".image-zoom-image");

if (dialog && enlargedImage) {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-image-zoom]");
    if (!trigger) return;

    event.preventDefault();
    enlargedImage.src = trigger.dataset.imageZoom;
    enlargedImage.alt = trigger.dataset.imageAlt || "";
    dialog.showModal();
  });

  dialog.querySelector(".image-zoom-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

// jsdom has no modal <dialog>. A minimal stand-in is enough for the component tests: import this
// file at the top of a test that renders a dialog.
HTMLDialogElement.prototype.showModal = function showModal() {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function close() {
  this.removeAttribute('open');
};

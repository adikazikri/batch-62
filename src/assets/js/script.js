$(document).ready(function () {
  // Delete image
  $('.deleteImageBtn').on('click', function (e) {
    e.preventDefault();

    const container = $(this).closest('label'); // Parent label
    container.find('.uploadImageEdit').val('');
    container.find('.previewImageEdit').attr('src', '');
    container.find('.existingImage').val('');
  });

  // Image preview saat upload baru
  $('.uploadImageEdit').on('change', function () {
    const file = this.files[0];
    const container = $(this).closest('label');
    const preview = container.find('.previewImageEdit');

    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        preview.attr('src', e.target.result);
      };
      reader.readAsDataURL(file);
    }
  });
});


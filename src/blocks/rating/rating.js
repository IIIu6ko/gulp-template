// Добавляем активный класс инпуту, который checked изначально.
$(".rating__input").each(function() {
  if ($(this).prop("checked")) {
    $(this).parents(".rating__item").addClass("rating__item--active");
  }
});
addActivePrevAllChecked();

// Ловим событие изменения инпута.
$(".rating__input").change(function() {
  deleteActiveAll($(this));
  addActivePrevAllChecked();
});

// Событие наведения.
$(".rating__item").hover(function() {
  /* Удаляем активный класс у всех следующих элементов */
  $(this).nextAll(".rating__item").removeClass("rating__item--active");

  /* Добавляем активный класс всем предыдущим элементам */
  $(this).prevAll(".rating__item").addClass("rating__item--active");
}, function() {
  deleteActiveAll($(this));
  addActivePrevAllChecked();
});

// Удаляем активный класс у всех инпутов.
function deleteActiveAll($this) {
  $this.parents(".rating").find(".rating__input").each(function() {
    $(this).parents(".rating__item").removeClass("rating__item--active");
  });
}

/* Ищём все инпуты, проверяем каждый на наличие checked, если checked есть, то ищем его родителя, добавляем родителю активный класс, ищем все предыдущие элементы на уровне родителя инпута, добавляем им активный класс. */
function addActivePrevAllChecked() {
  $(".rating").find(".rating__input").each(function() {
    if ($(this).prop("checked")) {
      $(this).parents(".rating__item").addClass("rating__item--active").prevAll(".rating__item").addClass("rating__item--active");
    }
  });
}
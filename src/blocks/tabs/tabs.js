function openTab(evt, tabName, speed) {
  var container = ".tabs";
  var buttonsContainer = ".tabs__nav";
  var buttons = ".tabs__button";
  var content = ".tabs__content";
  var tabNameArr = [];

  // Проверка на наличие индентификатора.
  if ($(evt.target).closest(container).find(content).is("#" + tabName)) {

    // evt.target - таб, на который был клик.
    $(evt.target).closest(buttonsContainer).find(buttons).removeClass("active");

    // Собирает в массив все параметры tabName
    $(evt.target).closest(buttonsContainer).find(buttons).each(function() {
      tabNameArr[tabNameArr.length] = $(this).attr("onclick").match(/\'(.+?)\'/)[1];
    });

    // Скрывает только тот контент, id которого есть в массиве tabNameArr
    $.each(tabNameArr, function(key, val) {
      $(evt.target).closest(container).find(content + "#" + val).hide();
    });

    $("#" + tabName).fadeIn(speed * 2);

    // Добавляет класс .active только тегу с классом tabs__button
    if (evt.target.classList[0] === "tabs__button") {
      $(evt.target).addClass("active");
    } else {
      $(evt.target).closest(buttons).addClass("active");
    }
  } else {
    alert("Неверный идентификатор!");
  }
}

// Открывает первый таб.
$(".tabs").each(function() {
  $(this).find(".tabs__button:first").trigger("click");
});
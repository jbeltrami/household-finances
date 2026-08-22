// Reusable quiz component.
//
// Markup contract:
//   <div class="quiz" data-answer="freeze">
//     <p class="quiz-q"><span class="n">01</span>Question text</p>
//     <div class="quiz-choices">
//       <button data-choice="freeze">Freeze it</button>
//       <button data-choice="follow">Follow it</button>
//     </div>
//     <div class="quiz-fb" data-for="freeze">…feedback if freeze was picked…</div>
//     <div class="quiz-fb" data-for="follow">…feedback if follow was picked…</div>
//   </div>
//
// Feedback is per-choice, not per-correctness, so a wrong answer gets an
// explanation of why *that* answer is tempting rather than a bare "no".
// That is the whole point of the feedback loop: retrieval plus a corrective
// beats retrieval alone.
//
// Optionally add <p class="quiz-score" data-quiz-score></p> anywhere on the
// page and it will keep a running tally.

(function () {
  "use strict";

  function init() {
    var quizzes = Array.prototype.slice.call(document.querySelectorAll(".quiz"));
    var scoreEl = document.querySelector("[data-quiz-score]");
    var answered = 0;
    var correct = 0;

    function renderScore() {
      if (!scoreEl) return;
      if (answered === 0) {
        scoreEl.textContent =
          "Answer each one before reading its feedback — the guess is what makes it stick.";
        return;
      }
      scoreEl.textContent =
        correct + " of " + answered + " so far (" + quizzes.length + " in this lesson).";
    }

    quizzes.forEach(function (quiz) {
      var expected = quiz.getAttribute("data-answer");
      var buttons = Array.prototype.slice.call(
        quiz.querySelectorAll(".quiz-choices button")
      );

      buttons.forEach(function (button) {
        button.addEventListener("click", function () {
          if (quiz.hasAttribute("data-done")) return;
          quiz.setAttribute("data-done", "true");

          var choice = button.getAttribute("data-choice");
          var isRight = choice === expected;

          answered += 1;
          if (isRight) correct += 1;

          buttons.forEach(function (other) {
            other.disabled = true;
            var otherChoice = other.getAttribute("data-choice");
            if (other === button) {
              other.classList.add(isRight ? "picked-right" : "picked-wrong");
            } else if (otherChoice === expected) {
              other.classList.add("was-right");
            }
          });

          var feedback = quiz.querySelector('.quiz-fb[data-for="' + choice + '"]');
          if (feedback) feedback.classList.add("shown");

          renderScore();
        });
      });
    });

    renderScore();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

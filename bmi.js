(function () {
  function get(el) { return document.querySelector(el); }
  function getAll(el) { return document.querySelectorAll(el); }

  const formBmi = get('#bmiForm');

  const inputWeight = get('#inputWeight');
  const inputHeight = get('#inputHeight');
  const inputAge = get('#inputAge');
  const selectGender = get('#selectGender');

  const unitLabel = get('#unitLabel');
  const radioUnits = getAll('input[name="radioUnits"]');

  const textBeforeResult = get('#textBeforeResult');
  const resultBox = get('#resultBox');
  const textBmiValue = get('#textBmiValue');
  const textBmiCategory = get('#textBmiCategory');
  const textTipLine = get('#textTipLine');

  const btnClear = get('#btnClear');

  // Labels and helper text for dynamic unit changes
  const labelWeight = document.querySelector('label[for="inputWeight"]');
  const labelHeight = document.querySelector('label[for="inputHeight"]');
  const helpWeight = get('#weightHelp');
  const helpHeight = get('#heightHelp');

  // ====== Inline field error helpers ======
  function createErrorEl(inputEl) {
    const id = inputEl.id + '_error';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.setAttribute('role', 'alert');
      el.style.cssText = 'color:#dc2626;font-size:.85rem;margin-top:.3rem;display:none;';
      inputEl.parentNode.appendChild(el);
    }
    return el;
  }

  function showFieldError(inputEl, msg) {
    const el = createErrorEl(inputEl);
    el.textContent = msg;
    el.style.display = 'block';
    inputEl.style.borderColor = '#dc2626';
    inputEl.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(inputEl) {
    const el = document.getElementById(inputEl.id + '_error');
    if (el) { el.style.display = 'none'; el.textContent = ''; }
    inputEl.style.borderColor = '';
    inputEl.removeAttribute('aria-invalid');
  }

  function clearAllFieldErrors() {
    [inputWeight, inputHeight, inputAge].forEach(clearFieldError);
  }

  // Clear field errors on input change
  [inputWeight, inputHeight, inputAge].forEach(function(input) {
    input.addEventListener('input', function() { clearFieldError(input); });
  });

  // ====== Update labels/placeholders when unit changes ======
  function updateUnitsUI() {
    const selectedUnit = document.querySelector('input[name="radioUnits"]:checked').value;

    if (selectedUnit === 'metric') {
      unitLabel.textContent = 'Metric (kg, cm)';
      labelWeight.innerHTML = 'Weight <span class="req">(kg) *</span>';
      labelHeight.innerHTML = 'Height <span class="req">(cm) *</span>';
      helpWeight.textContent = 'Example: 69';
      helpHeight.textContent = 'Example: 169';
      inputWeight.placeholder = 'Enter your weight in kgs';
      inputHeight.placeholder = 'Enter your height in cms';
      inputWeight.max = 500;
      inputHeight.max = 300;
    } else {
      unitLabel.textContent = 'Imperial (lb, in)';
      labelWeight.innerHTML = 'Weight <span class="req">(lb) *</span>';
      labelHeight.innerHTML = 'Height <span class="req">(in) *</span>';
      helpWeight.textContent = 'Example: 143 (lb)';
      helpHeight.textContent = "Example: 67 (in) or 5'7\"";
      inputWeight.placeholder = 'Enter your weight in pounds';
      inputHeight.placeholder = "Enter height in inches or e.g. 5'7\"";
      inputWeight.max = 1100;
      inputHeight.max = 120;
    }

    // Clear errors when unit switches
    clearAllFieldErrors();
  }

  // Listen to any change on the unit selection (metric/imperial)
  radioUnits.forEach(function (radio) {
    radio.addEventListener('change', updateUnitsUI);
  });

  // ====== Parse height: supports plain numbers and feet'inches" format ======
  function parseHeight(rawValue, units) {
    if (units !== 'imperial') return parseFloat(rawValue);

    const str = String(rawValue).trim();

    // Match patterns like 5'7", 5'7, 5 7, 5ft7in, etc.
    const feetInchesMatch = str.match(/^(\d+(?:\.\d+)?)\s*['\s]\s*(\d+(?:\.\d+)?)/);
    if (feetInchesMatch) {
      const feet = parseFloat(feetInchesMatch[1]);
      const inches = parseFloat(feetInchesMatch[2]);
      return feet * 12 + inches;
    }

    return parseFloat(str);
  }

  // ====== Calculate BMI based on selected units ======
  function calculateBmiValue(weight, height, units) {
    // For metric: BMI = kg / (m^2)
    // For imperial: BMI = 703 * lb / (in^2)
    if (units === 'metric') {
      var heightInMeters = height / 100;
      return weight / (heightInMeters * heightInMeters);
    } else {
      return 703 * weight / (height * height);
    }
  }

  // ====== Get BMI category based on WHO ranges ======
  // Boundary: BMI 18.5 = Normal, 25.0 = Overweight, 30.0 = Obese
  function getBmiCategory(bmiNumber) {
    if (bmiNumber < 18.5) {
      return { key: 'under', label: 'Underweight', className: 'cat-under' };
    } else if (bmiNumber < 25) {
      return { key: 'normal', label: 'Normal weight', className: 'cat-normal' };
    } else if (bmiNumber < 30) {
      return { key: 'over', label: 'Overweight', className: 'cat-over' };
    } else {
      return { key: 'obese', label: 'Obesity', className: 'cat-obese' };
    }
  }

  // ====== Age & Gender contextual insights ======
  function getAgeGenderNote(age, gender, bmiNumber, categoryKey) {
    const notes = [];

    if (age) {
      const ageNum = parseInt(age, 10);

      // Children & teens (2–19): BMI-for-age percentile approach
      if (ageNum >= 2 && ageNum <= 19) {
        notes.push('For ages 2–19, BMI is best interpreted using CDC BMI-for-age percentile charts, which compare against peers of the same age. Standard adult categories may not apply — please consult a pediatrician.');
      }

      // Young adults (20–39): standard ranges apply well
      else if (ageNum >= 20 && ageNum <= 39) {
        if (categoryKey === 'normal') {
          notes.push('At your age, maintaining a BMI of 18.5–24.9 is associated with good metabolic health. Regular activity and balanced nutrition support long-term wellbeing.');
        }
      }

      // Middle-aged (40–64): slight upward drift is common
      else if (ageNum >= 40 && ageNum <= 64) {
        notes.push('From age 40 onward, muscle mass gradually declines. Your BMI number may look the same even if body composition shifts toward more fat. Strength training and protein intake can help preserve muscle mass.');
        if (categoryKey === 'normal' && bmiNumber >= 22) {
          notes.push('Some research suggests a BMI of 22–27 may be associated with optimal outcomes in this age range due to metabolic changes.');
        }
      }

      // Seniors (65+): slightly higher BMI may be protective
      else if (ageNum >= 65) {
        notes.push('For adults 65+, a slightly higher BMI (around 23–28) is often considered acceptable and may even be protective against frailty and illness. Sarcopenia (muscle loss) is a key concern — maintaining strength matters as much as weight.');
        if (categoryKey === 'under') {
          notes.push('Being underweight at 65+ carries elevated health risks, including bone fragility and reduced immunity. Please consult your healthcare provider.');
        }
      }

      // Age = 1: very young
      if (ageNum === 1) {
        notes.push('For children under 2, weight and growth should be assessed using WHO infant growth charts with a pediatrician, not standard adult BMI.');
      }
    }

    // Gender-specific insights
    if (gender === 'female') {
      notes.push('Women typically have a higher body fat percentage than men at the same BMI. Hormonal factors (e.g., menopause) can shift fat distribution over time, affecting health risk independently of BMI.');
      if (categoryKey === 'normal' && bmiNumber >= 23) {
        notes.push('Some studies note slightly higher cardiovascular risk for women above BMI 23. A holistic health assessment including waist circumference provides a fuller picture.');
      }
    } else if (gender === 'male') {
      notes.push('Men tend to carry more visceral (abdominal) fat than women at equivalent BMI values. Waist circumference above 40 inches (102 cm) is an independent cardiovascular risk factor even at a "normal" BMI.');
      if (categoryKey === 'normal' && bmiNumber >= 24) {
        notes.push('Athletes and muscular individuals may have a BMI toward the higher end of Normal without excess body fat. Consider body composition assessment if you are very active.');
      }
    }

    return notes;
  }

  // ====== Short tip text for each category (non-medical) ======
  function getTipForCategory(categoryKey) {
    if (categoryKey === 'under') {
      return 'Your BMI is below 18.5. Consider speaking with a healthcare professional about nutrition and strength-building. Athletic frames may skew BMI lower.';
    }
    if (categoryKey === 'normal') {
      return 'Your BMI is in the 18.5–24.9 range. Maintain balanced nutrition, regular activity, and quality sleep.';
    }
    if (categoryKey === 'over') {
      return 'Your BMI is 25–29.9. Gradual activity and nutrition changes can help. BMI may be influenced by higher muscle mass.';
    }
    // obese
    return 'Your BMI is 30 or higher. Lifestyle changes and medical guidance can provide personalized, evidence-based support.';
  }

  // ====== Validate all inputs, show inline errors ======
  function validateAllInputs(weight, height, age, gender, units, rawHeightVal) {
    let hasError = false;

    // Weight: required
    if (!inputWeight.value.trim()) {
      showFieldError(inputWeight, 'Please enter your weight.');
      hasError = true;
    } else if (isNaN(weight) || !isFinite(weight)) {
      showFieldError(inputWeight, 'Please enter a numeric value for weight.');
      hasError = true;
    } else if (weight <= 0) {
      showFieldError(inputWeight, 'Weight must be greater than zero.');
      hasError = true;
    } else if (units === 'metric' && weight > 500) {
      showFieldError(inputWeight, 'Weight exceeds the maximum allowed limit (500 kg).');
      hasError = true;
    } else if (units === 'imperial' && weight > 1100) {
      showFieldError(inputWeight, 'Weight exceeds the maximum allowed limit (1100 lb).');
      hasError = true;
    } else {
      clearFieldError(inputWeight);
    }

    // Height: required
    if (!String(rawHeightVal).trim() || inputHeight.value.trim() === '') {
      showFieldError(inputHeight, 'Please enter your height.');
      hasError = true;
    } else if (isNaN(height) || !isFinite(height)) {
      showFieldError(inputHeight, 'Please enter a valid numeric height.');
      hasError = true;
    } else if (height <= 0) {
      showFieldError(inputHeight, 'Height must be greater than zero.');
      hasError = true;
    } else if (units === 'metric' && height > 300) {
      showFieldError(inputHeight, 'Height exceeds the maximum allowed limit (300 cm).');
      hasError = true;
    } else if (units === 'imperial' && height > 120) {
      showFieldError(inputHeight, 'Height exceeds the maximum allowed limit (120 inches).');
      hasError = true;
    } else {
      clearFieldError(inputHeight);
    }

    // Age: optional but if entered must be valid
    if (inputAge.value.trim()) {
      if (isNaN(age) || !isFinite(age)) {
        showFieldError(inputAge, 'Age must be a number.');
        hasError = true;
      } else if (age < 1 || age > 120) {
        showFieldError(inputAge, 'Please enter a valid age (1 – 120).');
        hasError = true;
      } else {
        clearFieldError(inputAge);
      }
    } else {
      clearFieldError(inputAge);
    }

    return !hasError;
  }

  // ====== Show the result in the UI ======
  function showResult(bmiNumber, categoryObj, age, gender) {
    // Hide the "before" text and show the result box
    textBeforeResult.style.display = 'none';
    resultBox.style.display = 'block';

    // Set values - show 2 decimal places for precision
    textBmiValue.textContent = bmiNumber.toFixed(2);
    textBmiCategory.textContent = categoryObj.label;
    textBmiCategory.className = 'bmi-cat ' + categoryObj.className;

    // Set tip line
    textTipLine.textContent = getTipForCategory(categoryObj.key);

    // Age & gender contextual notes
    removeAgeGenderNotes();
    const ageGenderNotes = getAgeGenderNote(age, gender, bmiNumber, categoryObj.key);
    if (ageGenderNotes.length > 0) {
      const container = document.createElement('div');
      container.id = 'ageGenderNotesContainer';
      container.style.cssText = 'margin-top:.75rem;text-align:left;';

      const heading = document.createElement('div');
      heading.style.cssText = 'font-size:.82rem;font-weight:700;color:#0b6ea5;margin-bottom:.35rem;text-transform:uppercase;letter-spacing:.03em;';
      heading.textContent = 'Personalized Insights';
      container.appendChild(heading);

      ageGenderNotes.forEach(function(note) {
        const p = document.createElement('p');
        p.style.cssText = 'font-size:.86rem;color:#4b6072;margin:.3rem 0 0;line-height:1.5;';
        p.textContent = '• ' + note;
        container.appendChild(p);
      });

      resultBox.appendChild(container);
    }
  }

  function removeAgeGenderNotes() {
    const existing = document.getElementById('ageGenderNotesContainer');
    if (existing) existing.remove();
  }

  // ====== Handle form submit (Calculate button) ======
  formBmi.addEventListener('submit', function (event) {
    event.preventDefault();

    const currentUnits = document.querySelector('input[name="radioUnits"]:checked').value;
    const weightValue = parseFloat(inputWeight.value);
    const rawHeightInput = inputHeight.value;
    const heightValue = parseHeight(rawHeightInput, currentUnits);
    const ageValue = parseFloat(inputAge.value);
    const genderValue = selectGender.value;

    // Validate - inline errors shown inside function
    const isValid = validateAllInputs(weightValue, heightValue, ageValue, genderValue, currentUnits, rawHeightInput);

    if (!isValid) {
      // Show a general prompt only if resultBox was previously shown
      if (resultBox.style.display === 'block') {
        textBeforeResult.textContent = 'Please fix the errors above and recalculate.';
        textBeforeResult.style.display = 'block';
        resultBox.style.display = 'none';
        removeAgeGenderNotes();
      } else {
        textBeforeResult.textContent = 'Please fill in the required fields above.';
        textBeforeResult.style.display = 'block';
      }
      return;
    }

    // Do the math
    const bmiNumber = calculateBmiValue(weightValue, heightValue, currentUnits);
    const bmiCategory = getBmiCategory(bmiNumber);

    // Update UI
    const ageForInsights = inputAge.value.trim() ? ageValue : null;
    showResult(bmiNumber, bmiCategory, ageForInsights, genderValue);

    // Reset the general message
    textBeforeResult.style.display = 'none';
  });

  // ====== Handle Clear button ======
  btnClear.addEventListener('click', function () {
    // Reset the form to its initial state
    formBmi.reset();
    updateUnitsUI();
    clearAllFieldErrors();
    removeAgeGenderNotes();

    // Show the before text and hide the result
    textBeforeResult.textContent = 'Enter your details to see your BMI result';
    textBeforeResult.style.display = 'block';
    resultBox.style.display = 'none';

    // Fix placeholders after reset based on current unit
    const currentUnits = document.querySelector('input[name="radioUnits"]:checked').value;
    inputWeight.placeholder = currentUnits === 'metric' ? 'Enter your weight in kgs' : 'Enter your weight in pounds';
    inputHeight.placeholder = currentUnits === 'metric' ? 'Enter your height in cms' : "Enter height in inches or e.g. 5'7\"";
  });

  // ====== Initialize the UI on page load ======
  updateUnitsUI();
})();

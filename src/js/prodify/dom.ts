import {
  ADD_BUTTON_TEXT_UNAVAILABLE_STRING,
  SOLD_OUT_VARIANT_VALUE_STRING,
  UNAVAILABLE_VARIANT_VALUE_STRING,
  PRODUCT_FORM_SELECTOR,
  PRICE_CONTAINER_SELECTOR,
  MEDIA_CONTAINER_SELECTOR
} from './const'
import { fetchHTML } from './helpers'

function updateDomAddButton(disable = true, text?: string, modifyClass = true) {
  const productForm = document.querySelector(PRODUCT_FORM_SELECTOR)
  
  if (!productForm) return

  const addButton = productForm.querySelector('[name="add"]')
  const addButtonText = productForm.querySelector('[name="add"] > span') as HTMLElement | null

  if (!addButton) return

  if (disable) {
    addButton.setAttribute('disabled', 'disabled')
    if (text && addButtonText) addButtonText.textContent = text
  } else {
    addButton.removeAttribute('disabled')
    if (addButtonText) addButtonText.textContent = ADD_BUTTON_TEXT_UNAVAILABLE_STRING
  }

  if (!modifyClass) return

  if (disable) {
    addButton.classList.add('disabled')
  } else {
    addButton.classList.remove('disabled')
  }
}

function updateVariantIdInput() {
  const productForms = document.querySelectorAll(PRODUCT_FORM_SELECTOR)
  productForms.forEach((productForm) => {
    const input = productForm.querySelector('input[name="id"]') as HTMLInputElement
    if (input && window.prodify.currentVariant) {
      input.value = window.prodify.currentVariant.id.toString()
    }
    // input.dispatchEvent(new Event('change', { bubbles: true }));
  })
}

function setInputAvailability(optionInputs: NodeListOf<Element> | Element[], availableOptionInputValues: string[], existingOptionInputsValues: string[]) {
  optionInputs.forEach((input: Element) => {
    const inputValue = input.getAttribute('value')
    if (inputValue && availableOptionInputValues.includes(inputValue)) {
      if (window.prodify.pickerType == 'select') {
        const value = input.getAttribute('value')
        if (value) (input as HTMLElement).innerText = value
        return
      }
      input.classList.remove('disabled')
    } else {
      if (inputValue && existingOptionInputsValues.includes(inputValue)) {
        if (window.prodify.pickerType == 'select') {
          if (inputValue) {
            (input as HTMLElement).innerText = SOLD_OUT_VARIANT_VALUE_STRING.replace(
              '[value]',
              inputValue
            )
          }
          return
        }
        input.classList.add('disabled')
      } else {
        if (window.prodify.pickerType == 'select') {
          if (inputValue) {
            (input as HTMLElement).innerText = UNAVAILABLE_VARIANT_VALUE_STRING.replace(
              '[value]',
              inputValue
            )
          }
          return
        }
        input.classList.add('disabled')
      }
    }
  })
}

function maybeSetOptionSelected(select: HTMLSelectElement) {
  if (window.prodify.pickerType == 'select') {
    const options = Array.from(select.querySelectorAll('option'))
    const currentValue = select.value

    options.forEach((option: HTMLOptionElement) => {
      if (option.value === currentValue) {
        option.setAttribute('selected', 'selected')
      } else {
        option.removeAttribute('selected')
      }
    })
  }
}

function updateQuantity(stepDirection: 'up' | 'down') {
  if (!window.prodify.quantityPresentationInput || !window.prodify.quantityHiddenInput) return
  const previousQuantity = parseInt(window.prodify.quantityPresentationInput.value)

  if (stepDirection == 'up') {
    const newValue = (previousQuantity + 1).toString()
    window.prodify.quantityHiddenInput.value = window.prodify.quantityPresentationInput.value = newValue
  } else {
    const newValue = Math.max(1, previousQuantity - 1).toString()
    window.prodify.quantityHiddenInput.value = window.prodify.quantityPresentationInput.value = newValue
  }
}

function swapProductInfo() {
  if (!window.prodify.currentVariant || !window.prodify.el.dataset.url || !window.prodify.el.dataset.section) return

  fetchHTML(
    `${window.prodify.el.dataset.url}?variant=${window.prodify.currentVariant.id}&section_id=${window.prodify.el.dataset.section}`
  )
    .then((responseHTML) => {
      const priceSource = responseHTML.querySelector(PRICE_CONTAINER_SELECTOR)
      const priceTarget = window.prodify.el.querySelector(PRICE_CONTAINER_SELECTOR)
      const mediaSource = responseHTML.querySelector(MEDIA_CONTAINER_SELECTOR)
      const mediaTarget = window.prodify.el.querySelector(MEDIA_CONTAINER_SELECTOR)
      const addButtonSource = responseHTML.querySelector(
        `${PRODUCT_FORM_SELECTOR} [name="add"]`
      )
      const addButtonTarget = window.prodify.el.querySelector(`${PRODUCT_FORM_SELECTOR} [name="add"]`)

      if (priceSource && priceTarget) {
        priceTarget.replaceWith(priceSource)
      }

      if (mediaSource && mediaTarget) {
        mediaTarget.replaceWith(mediaSource)
      }

      if (addButtonSource && addButtonTarget) {
        addButtonTarget.replaceWith(addButtonSource)
      }

    })
}

export {
  updateQuantity,
  swapProductInfo,
  updateVariantIdInput,
  updateDomAddButton,
  setInputAvailability,
  maybeSetOptionSelected
}

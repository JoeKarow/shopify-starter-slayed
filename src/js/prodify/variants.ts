import { updateCurrentOptions } from './options'
import {
  updateDomAddButton,
  maybeSetOptionSelected,
  updateVariantIdInput,
  swapProductInfo
} from './dom'
import { compareInputValues, updateURL } from './helpers'
import {
  ADD_BUTTON_TEXT_UNAVAILABLE_STRING,
  VARIANTS_JSON_SELECTOR
} from './const'

function updateCurrentVariant() {
  const variants = getVariantData()
  if (!variants || !window.prodify.options) return

  const matchingVariant = variants.find(
    variant => {
      return variant.options.every((option, index) => {
        return window.prodify.options?.[index] === option
      })
    })
  window.prodify.currentVariant = matchingVariant
}

function onVariantChange(event: Event) {
  updateCurrentOptions()
  updateCurrentVariant()
  updateDomAddButton(true, '', false)
  compareInputValues()
  if (event.target) maybeSetOptionSelected(event.target as HTMLSelectElement)

  if (!window.prodify.currentVariant) {
    updateDomAddButton(true, ADD_BUTTON_TEXT_UNAVAILABLE_STRING, true)
  } else {
    updateURL()
    updateVariantIdInput()
    swapProductInfo()
  }
}

function getVariantData() {
  if (window.prodify.variantData) {
    return window.prodify.variantData
  }

  const variantScript = window.prodify.el.querySelector(VARIANTS_JSON_SELECTOR) as HTMLScriptElement
  if (variantScript && variantScript.textContent) {
    window.prodify.variantData = JSON.parse(variantScript.textContent)
    return window.prodify.variantData
  }

  return []
}

export {
  updateVariantIdInput,
  updateCurrentVariant,
  onVariantChange,
  getVariantData
}
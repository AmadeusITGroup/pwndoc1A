<template>
    <div>
      <component :is="customElement" v-for="(computedField, idx) in computedFields" :key="idx">
        <div class="row q-col-gutter-md">
          <div
            v-for="(field, idx2) in computedField"
            :key="idx2"
            :class="`col-12 col-md-${field.customField.size || 12} offset-md-${field.customField.offset || 0}`"
          >
            <q-field
              :ref="`field-${idx}-${idx2}`"
              v-if="field.customField.fieldType === 'text'"
              label-slot
              stack-label
              borderless
              :class="isTextInCustomFields(field) ? 'bg-diffbackground' : null"
              class="basic-editor"
              :hint="field.customField.description"
              hide-bottom-space
              :rules="field.customField.required ? [val => !!val || 'Field is required'] : []"
              lazy-rules="ondemand"
              :value="field.text"
            >
              <template v-slot:control>
                <basic-editor
                  v-if="diff"
                  v-model="field.text"
                  :diff="getTextDiffInCustomFields(field)"
                  :editable="false"
                />
                <basic-editor
                  v-else
                  ref="basiceditor_custom"
                  v-model="field.text"
                  :noSync="noSyncEditor"
                  :editable="!readonly"
                />
              </template>
  
              <template v-slot:label>
                {{ field.customField.label }} <span v-if="field.customField.required" class="text-red">*</span>
              </template>
              <q-badge v-if="commentMode" color="deep-purple" floating class="cursor-pointer" @click="$emit('create-comment', (`field-${field.customField.label}`))">
                        <q-icon name="add_comment" size="xs" />
              </q-badge>
            </q-field>
  
            <q-input
              :ref="`field-${idx}-${idx2}`"
              v-if="field.customField.fieldType === 'input'"
              :label="field.customField.label"
              stack-label
              v-model="field.text"
              :readonly="readonly"
              :bg-color="isTextInCustomFields(field) ? 'diffbackground' : null"
              :hint="field.customField.description"
              hide-bottom-space
              :rules="field.customField.required ? [val => !!val || 'Field is required'] : []"
              lazy-rules="ondemand"
              outlined
            >
              <template v-slot:label>
                {{ field.customField.label }} <span v-if="field.customField.required" class="text-red">*</span>
              </template>
              <q-badge v-if="commentMode" color="deep-purple" floating class="cursor-pointer" @click="$emit('create-comment', (`field-${field.customField.label}`))">
                        <q-icon name="add_comment" size="xs" />
              </q-badge>
            </q-input>
  
            <q-input
              :ref="`field-${idx}-${idx2}`"
              v-if="field.customField.fieldType === 'date'"
              :label="field.customField.label"
              stack-label
              v-model="field.text"
              :readonly="readonly"
              :bg-color="isTextInCustomFields(field) ? 'diffbackground' : null"
              :hint="field.customField.description"
              hide-bottom-space
              :rules="field.customField.required ? [val => !!val || 'Field is required'] : []"
              lazy-rules="ondemand"
              outlined
            >
              <template v-slot:append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy ref="qDateProxyField" transition-show="scale" transition-hide="scale">
                    <q-date
                      :readonly="readonly"
                      first-day-of-week="1"
                      mask="YYYY-MM-DD"
                      v-model="field.text"
                      @input="$refs.qDateProxyField.forEach(e => e.hide())"
                    />
                  </q-popup-proxy>
                </q-icon>
              </template>
              <template v-slot:label>
                {{ field.customField.label }} <span v-if="field.customField.required" class="text-red">*</span>
              </template>
              <q-badge v-if="commentMode" color="deep-purple" floating class="cursor-pointer" @click="$emit('create-comment', (`field-${field.customField.label}`))">
                        <q-icon name="add_comment" size="xs" />
              </q-badge>
            </q-input>
  
            <q-select
              :ref="`field-${idx}-${idx2}`"
              v-if="field.customField.fieldType === 'select'"
              :label="field.customField.label"
              stack-label
              v-model="field.text"
              :options="field.customField.options.filter(e => e.locale === locale)"
              option-value="value"
              option-label="value"
              emit-value
              clearable
              options-sanitize
              outlined
              :readonly="readonly"
              :bg-color="isTextInCustomFields(field) ? 'diffbackground' : null"
              :hint="field.customField.description"
              hide-bottom-space
              :rules="field.customField.required ? [val => !!val || 'Field is required'] : []"
              lazy-rules="ondemand"
            >
              <template v-slot:label>
                {{ field.customField.label }} <span v-if="field.customField.required" class="text-red">*</span>
              </template>
              <q-badge v-if="commentMode" color="deep-purple" floating class="cursor-pointer" @click="$emit('create-comment', (`field-${field.customField.label}`))">
                        <q-icon name="add_comment" size="xs" />
              </q-badge>
            </q-select>
  
            <q-select
              :ref="`field-${idx}-${idx2}`"
              v-if="field.customField.fieldType === 'select-multiple'"
              :label="field.customField.label"
              stack-label
              v-model="field.text"
              :options="field.customField.options.filter(e => e.locale === locale)"
              option-value="value"
              option-label="value"
              emit-value
              multiple
              use-chips
              clearable
              options-sanitize
              outlined
              :readonly="readonly"
              :bg-color="isTextInCustomFields(field) ? 'diffbackground' : null"
              :hint="field.customField.description"
              hide-bottom-space
              :rules="field.customField.required
                ? [val => !!val || 'Field is required', val => val && val.length > 0 || 'Field is required']
                : []"
              lazy-rules="ondemand"
            >
              <template v-slot:label>
                {{ field.customField.label }} <span v-if="field.customField.required" class="text-red">*</span>
              </template>
              <q-badge v-if="commentMode" color="deep-purple" floating class="cursor-pointer" @click="$emit('create-comment', (`field-${field.customField.label}`))">
                        <q-icon name="add_comment" size="xs" />
              </q-badge>
              <template v-slot:selected-item="scope">
                <q-chip
                  dense
                  removable
                  @remove="scope.removeAtIndex(scope.index)"
                  :tabindex="scope.tabindex"
                  color="blue-grey-5"
                  text-color="white"
                  :disable="readonly"
                >
                  {{ scope.opt }}
                </q-chip>
              </template>
            </q-select>
  
            <q-field
              :ref="`field-${idx}-${idx2}`"
              v-if="field.customField.fieldType === 'checkbox'"
              :label="field.customField.label"
              stack-label
              :value="field.text"
              :hint="field.description"
              hide-bottom-space
              outlined
              :readonly="readonly"
              :bg-color="isTextInCustomFields(field) ? 'diffbackground' : null"
              :rules="field.customField.required
                ? [val => !!val || 'Field is required', val => val && val.length > 0 || 'Field is required']
                : []"
              lazy-rules="ondemand"
            >
              <template v-slot:control>
                <q-option-group
                  type="checkbox"
                  v-model="field.text"
                  :options="getOptionsGroup(field.customField.options)"
                  :disable="readonly"
                />
              </template>
              <template v-slot:label>
                {{ field.customField.label }} <span v-if="field.customField.required" class="text-red">*</span>
              </template>
              <q-badge v-if="commentMode" color="deep-purple" floating class="cursor-pointer" @click="$emit('create-comment', (`field-${field.customField.label}`))">
                        <q-icon name="add_comment" size="xs" />
              </q-badge>
            </q-field>
  
            <q-field
              :ref="`field-${idx}-${idx2}`"
              v-if="field.customField.fieldType === 'radio'"
              :label="field.customField.label"
              stack-label
              :value="field.text"
              :hint="field.description"
              hide-bottom-space
              outlined
              :readonly="readonly"
              :bg-color="isTextInCustomFields(field) ? 'diffbackground' : null"
              :rules="field.customField.required ? [val => !!val || 'Field is required'] : []"
              lazy-rules="ondemand"
            >
              <template v-slot:control>
                <q-option-group
                  type="radio"
                  v-model="field.text"
                  :options="getOptionsGroup(field.customField.options)"
                  :disable="readonly"
                />
              </template>
              <template v-slot:label>
                {{ field.customField.label }} <span v-if="field.customField.required" class="text-red">*</span>
              </template>
              <q-badge v-if="commentMode" color="deep-purple" floating class="cursor-pointer" @click="$emit('create-comment', (`field-${field.customField.label}`))">
                        <q-icon name="add_comment" size="xs" />
              </q-badge>
            </q-field>
          </div>
        </div>
      </component>
    </div>
  </template>
  
  <script>
  import { ref, computed, getCurrentInstance } from 'vue';
  import BasicEditor from 'components/editor';
  
  export default {
    name: 'CustomFields',
    props: {
      modelValue: {
        type: Array,
        default: [],
      },
      customElement: {
        type: String,
        default: 'div',
      },
      noSyncEditor: {
        type: Boolean,
        default: false,
      },
      diff: {
        type: Array,
        default: null,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      locale: {
        type: String,
        default: '',
      },
    },
    setup(props) {
      const { proxy } = getCurrentInstance();
  
      const computedFields = computed(() => {
        const result = [];
        let tmpArray = [];
        if (props.modelValue) {
          props.modelValue.forEach(e => {
            if (e.customField.fieldType === 'space' && e.customField.size === 12) {
              result.push(tmpArray);
              result.push([]);
              tmpArray = [];
            } else {
              tmpArray.push(e);
            }
          });
          if (tmpArray.length > 0) result.push(tmpArray);
        }
        return result;
      });
  
      const isTextInCustomFields = field => {
        if (props.diff) {
          return (
            typeof props.diff.find(f => {
              return f.customField._id === field.customField._id && proxy.$_.isEqual(f.text, field.text);
            }) === 'undefined'
          );
        }
        return false;
      };
  
      const getTextDiffInCustomFields = field => {
        let result = '';
        if (props.diff) {
          props.diff.find(f => {
            if (f.customField._id === field.customField._id) result = f.text;
          });
        }
        return result;
      };
  
      const validate = () => {
        Object.keys(proxy.$refs).forEach(key => key.startsWith('field') && proxy.$refs[key][0].validate());
      };
  
      const requiredFieldsEmpty = () => {
        validate();
        return props.modelValue.some(
          e => e.customField.fieldType !== 'space' && e.customField.required && (!e.text || e.text.length === 0)
        );
      };
  
      const getOptionsGroup = options => {
        return options
          .filter(e => e.locale === props.locale)
          .map(e => {
            return { label: e.value, value: e.value };
          });
      };
  
      return {
        computedFields,
        isTextInCustomFields,
        getTextDiffInCustomFields,
        validate,
        requiredFieldsEmpty,
        getOptionsGroup,
      };
    },
    components: {
      BasicEditor,
    },
  };
  </script>
  
  <style>
  </style>
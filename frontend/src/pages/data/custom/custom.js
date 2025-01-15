import { ref, reactive, computed, onMounted, getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, Notify } from 'quasar'
import draggable from 'vue3-draggable'
import _ from 'lodash'
import BasicEditor from 'components/editor.vue'
import CustomFields from 'components/custom-fields.vue'

import DataService from '@/services/data'
import Utils from '@/services/utils'
import {user, isAllowed} from '@/services/user'
import TemplateService from '@/services/template'

export default {
    setup() {
        const { t } = useI18n()
        const { proxy } = getCurrentInstance()

        const templates = ref([])
        const languages = ref([])
        const newLanguage = ref({ locale: "", language: "" })
        const editLanguages = ref([])
        const editLanguage = ref(false)
        const locale = ref("")

        const auditTypes = ref([])
        const newAuditType = ref({ 
            name: "", 
            templates: [], 
            sections: [], 
            hidden: [] 
        })
        const editAuditTypes = ref([])
        const editAuditType = ref(false)

        const vulnTypes = ref([])
        const newVulnType = ref({ name: "", locale: "" })
        const editVulnTypes = ref([])
        const editVulnType = ref(false)

        const vulnCategories = ref([])
        const newVulnCat = ref({
            name: "", 
            sortValue: "cvssScore", 
            sortOrder: "desc", 
            sortAuto: true
        })
        const editCategories = ref([])
        const editCategory = ref(false)

        const customFields = ref([])
        const newCustomField = ref({
            label: "", 
            fieldType: "", 
            display: "general", 
            displaySub: "", 
            size: 12,
            offset: 0,
            required: false,
            description: '',
            text: [],
            options: []
        })
        const cfLocale = ref("")
        const newCustomOption = ref("")

        const sections = ref([])
        const newSection = ref({ field: "", name: "", icon: "" })
        const editSections = ref([])
        const editSection = ref(false)

        const errors = ref({
            locale: '',
        })

        const selectedTab = ref("languages")

        // Computed Properties
        const sortValueOptions = computed(() => [
        {label: t('cvssScore'), value: 'cvssScore'},
        {label: t('cvssTemporalScore'), value: 'cvssTemporalScore'},
        {label: t('cvssEnvironmentalScore'), value: 'cvssEnvironmentalScore'},
        {label: t('severity'), value: 'severity'},
        {label: t('Urgency'), value: 'urgency'}
        ])

        const sortOrderOptions = computed(() => [
        {label: t('ascending'), value: 'asc'},
        {label: t('descending'), value: 'desc'}
        ])

        const cfDisplayOptions = computed(() => [
        {label: t('auditGeneral'), value: 'general'},
        {label: t('auditFinding'), value: 'finding'},
        {label: t('auditSection'), value: 'section'},
        {label: t('vulnerability'), value: 'vulnerability'}
        ])

        const cfComponentOptions = computed(() => [
        {label: t('checkbox'), value: 'checkbox', icon: 'check_box'},
        {label: t('date'), value: 'date', icon: 'event'},
        {label: t('editor'), value: 'text', icon: 'mdi-format-pilcrow'},
        {label: t('input'), value: 'input', icon: 'title'},
        {label: t('radio'), value: 'radio', icon: 'radio_button_checked'},
        {label: t('select'), value: 'select', icon: 'far fa-caret-square-down'},
        {label: t('selectMultiple'), value: 'select-multiple', icon: 'filter_none'},
        {label: t('space'), value: 'space', icon: 'space_bar'}
        ])

        const filteredCustomFields = computed(() => 
        customFields.value.filter(field => 
            field.display === newCustomField.value.display && 
            field.displayList.every(e => newCustomField.value.displayList.indexOf(e) > -1)
        )
        )

        const newCustomFieldLangOptions = computed(() => 
        newCustomField.value.options.filter(e => e.locale === cfLocale.value)
        )

        const getTemplates  = () => {
            TemplateService.getTemplates()
            .then((data) => {
                templates.value = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        }

        const requiredFieldsEmpty = () => {
            Object.keys(proxy.$refs).forEach(key => {
                if (key.startsWith('validate') && proxy.$refs[key]) {
                    if (Array.isArray(proxy.$refs[key]))
                        proxy.$refs[key].forEach(e => e.validate())
                    else
                        proxy.$refs[key].validate()
                }
            })
            if (selectedTab.value === 'languages')  return !newLanguage.value.language || !newLanguage.value.locale
            if (selectedTab.value === 'audit-types')  return !newAuditType.value.name || newAuditType.value.templates.length !== languages.value.length || newAuditType.value.templates.some(e => !e)
        }

        const getLanguages = () => {
            DataService.getLanguages()
            .then((data) => {
                languages.value = data.data.datas;
                if (languages.value.length > 0) {
                    newVulnType.locale = languages.value[0].locale;
                    cfLocale.value = languages.value[0].locale;
                }
            })
            .catch((err) => {
                console.log(err)
            })
        }

        const createLanguage = () => {
            if (requiredFieldsEmpty())
                return;

            DataService.createLanguage(newLanguage.value)
            .then((data) => {
                newLanguage.value.locale = "";
                newLanguage.value.language = "";
                getLanguages();
                Notify.create({
                    message: 'Language created successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        }

        const updateLanguages = () => {
            DataService.updateLanguages(editLanguages.value)
            .then((data) => {
                getLanguages()
                editLanguage.value = false
                Notify.create({
                    message: 'Languages updated successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        }

        const removeLanguage = (locale) => {
            editLanguages.value = editLanguages.value.filter(e => e.locale !== locale)
        }

        const getAuditTypes = () => {
            DataService.getAuditTypes()
                    .then((data) => {
                        auditTypes.value = data.data.datas;
                    })
                    .catch((err) => {
                        console.log(err)
                    })
        }

        const createAuditType = () => {
            if (requiredFieldsEmpty())
                return
            DataService.createAuditType(newAuditType.value)
            .then((data) => {
                newAuditType.name = "";
                newAuditType.templates = [];
                newAuditType.sections = [];
                newAuditType.hidden = [];
                getAuditTypes();
                Notify.create({
                    message: 'Audit type created successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })

        }

        const updateAuditTypes = () => {

            DataService.updateAuditTypes(editAuditTypes.value)
            .then((data) => {
                getAuditTypes()
                editAuditType.value = false
                Notify.create({
                    message: 'Audit Types updated successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        }

        const removeAuditType = (auditType) => {
            editAuditTypes.value = editAuditTypes.value.filter(e => e.name !== auditType.name)
        }

        const getTemplateOptionsLanguage = (locale) => {
            var result = []
            templates.value.forEach(e => result.push({name: e.name, locale: locale, template: e._id}))
            return result
        }

        const getVulnerabilityTypes = () => {
            DataService.getVulnerabilityTypes()
            .then((data) => {
                vulnTypes.value = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        }

        const createVulnerabilityType = () => {

            cleanErrors();
            if (!newVulnType.value.name)
                errors.vulnType = "Name required";
            if (errors.vulnType)
                return;
            
            DataService.createVulnerabilityType(newVulnType.value)
            .then((data) => {
                newVulnType.name = "";
                getVulnerabilityTypes();
                Notify.create({
                    message: 'Vulnerability type created successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        }

        const updateVulnTypes = () => {

            DataService.updateVulnTypes(editVulnTypes)
            .then((data) => {
                getVulnerabilityTypes()
                editVulnType = false
                Notify.create({
                    message: 'Vulnerability Types updated successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        }

        const removeVulnType = () => {
            editVulnTypes = editVulnTypes.filter(e => e.name !== vulnType.name || e.locale !== vulnType.locale)
        }

        const getVulnerabilityCategories = () => {
            DataService.getVulnerabilityCategories()
            .then((data) => {
                vulnCategories.value = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        }

        const createVulnerabilityCategory = () => {
            cleanErrors();
            if (!newVulnCat.value.name)
                errors.vulnCat = "Name required";
            
            if (errors.vulnCat)
                return;

            DataService.createVulnerabilityCategory(newVulnCat.value)
            .then((data) => {
                newVulnCat.value = {name: "", sortValue: "cvssScore", sortOrder: "desc", sortAuto: true}
                getVulnerabilityCategories();
                Notify.create({
                    message: 'Vulnerability category created successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        }

        const updateVulnCategories = () => {

            DataService.updateVulnerabilityCategories(editCategories.value)
            .then((data) => {
                getVulnerabilityCategories()
                editCategory.value = false
                Notify.create({
                    message: 'Vulnerability Categories updated successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        }

        const removeCategory = (vulnCat) => {
            editCategories.value = editCategories.value.filter(e => e.name !== vulnCat.name)
        }

        const getSortOptions = (category) => {
            var options = [
                {label: t('cvssScore'), value: 'cvssScore'},
                {label: t('cvssTemporalScore'), value: 'cvssTemporalScore'},
                {label: t('cvssEnvironmentalScore'), value: 'cvssEnvironmentalScore'},
            ]
            var allowedFieldTypes = ['date', 'input', 'radio', 'select']
            customFields.value.forEach(e => {
                if (
                    (e.display === 'finding' || e.display === 'vulnerability') && 
                    (!e.displaySub || e.displaySub === category) && 
                    allowedFieldTypes.includes(e.fieldType)
                ) {
                    options.push({label: e.label, value: e.label})
                }
            })
            return options
        }

        const getCustomFields = () => {

            DataService.getCustomFields()
            .then((data) => {
                customFields.value = data.data.datas.filter(e => e.display)
            })
            .catch((err) => {
                console.log(err)
            })
        }

        const createCustomField = () => {

            if (newCustomField.value.fieldType !== 'space') {
                proxy.$refs['select-component'].validate()
                proxy.$refs['input-label'].validate()

                if (proxy.$refs['select-component'].hasError || proxy.$refs['input-label'].hasError)
                    return
            }
            newCustomField.value.position = customFields.value.length
            DataService.createCustomField(newCustomField.value)
            .then((data) => {
                newCustomField.value.label = ""
                newCustomField.value.options = []
                getCustomFields()
                Notify.create({
                    message: 'Custom Field created successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        }

        const updateCustomFields = () => {
            var position = 0
            customFields.value.forEach(e => e.position = position++)
            DataService.updateCustomFields(customFields.value)
            .then((data) => {
                getCustomFields()
                Notify.create({
                    message: 'Custom Fields updated successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        };

        const deleteCustomField = (customField) => {

            Dialog.create({
                title: 'Confirm Suppression',
                message: `
                <div class="row">
                    <div class="col-md-2">
                        <i class="material-icons text-warning" style="font-size:42px">warning</i>
                    </div>
                    <div class="col-md-10">
                        Custom Field <strong>${customField.label}</strong> will be permanently deleted.<br>
                        This field will be removed from <strong>ALL</strong> Vulnerablities and associated data
                        will be permanently <strong>LOST</strong>!
                    </div>
                </div>
                `,
                ok: {label: t('btn.confirm'), color: 'positive'},
                cancel: {label: t('btn.cancel'), color: 'negative'},
                html: true,
                style: "width: 600px"
            })
            .onOk(() => {
                DataService.deleteCustomField(customField._id)
                .then((data) => {
                    getCustomFields()
                    Notify.create({
                        message: `
                        Custom Field <strong>${customField.label}</strong> deleted successfully.<br>
                        <strong>${data.data.datas.vulnCount}</strong> Vulnerabilities were affected.`,
                        color: 'positive',
                        textColor:'white',
                        position: 'top-right',
                        html: true
                    })
                })
                .catch((err) => {
                    console.log(err)
                    Notify.create({
                        message: err.response.data.datas.msg || err.response.data.datas,
                        color: 'negative',
                        textColor: 'white',
                        position: 'top-right'
                    })
                })
            })
        }

        const canDisplayCustomField = async (field) => {
            if (!field) return 
            return (
                (newCustomField.value.display === field.display || (newCustomField.value.display === 'finding' && field.display === 'vulnerability')) && 
                (newCustomField.value.displaySub === field.displaySub || field.displaySub === '')
            )
        }

        const canDisplayCustomFields = async () => {
            const results = await Promise.all(
                customFields.value.map(field => canDisplayCustomField(field))
            );
            return results.some(result => result);

        }

        const getFieldLocaleText = (fieldIdx) => {

            var text = customFields.value[fieldIdx].text
            for (var i=0; i<text.length; i++) {
                if (text[i].locale === cfLocale.value)
                    return i
            }
            if (['select-multiple', 'checkbox'].includes(customFields.value[fieldIdx].fieldType))
                text.push({locale: cfLocale.value, value: []})
            else
                text.push({locale: cfLocale.value, value: ""})
            return i
        }

        const addCustomFieldOption = (options) => {
            options.push({locale: cfLocale.value, value: newCustomOption.value})
            newCustomOption.value = ""
        }

        const removeCustomFieldOption = (options, option) => {
            var index = options.findIndex(e => e.locale === option.locale && e.value === option.value)
            options.splice(index, 1)
        }

        const getOptionsGroup = (options) => {
            return options
            .filter(e => e.locale === cfLocale.value)
            .map(e => {return {label: e.value, value: e.value}})
        }

        const getFieldLangOptions = (options) => {
            return options.filter(e => e.locale === cfLocale.value)
        }

        const getSections = () => {
            DataService.getSections()
            .then((data) => {
                sections.value = data.data.datas;
            })
            .catch((err) => {
                console.log(err)
            })
        }

        const createSection = () => {
            cleanErrors();
            if (!newSection.value.field)
                errors.sectionField = "Field required";
            if (!newSection.value.name)
                errors.sectionName = "Name required";
            
            if (errors.sectionName || errors.sectionField)
                return;
            DataService.createSection(newSection.value)
            .then((data) => {
                newSection.value.field = "";
                newSection.value.name = "";
                newSection.value.icon = ""
                getSections();
                Notify.create({
                    message: 'Section created successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        }

        const updateSections = () => {
            DataService.updateSections(editSections.value)
            .then((data) => {
                sections.value = editSections.value
                editSection.value = false
                Notify.create({
                    message: 'Sections updated successfully',
                    color: 'positive',
                    textColor:'white',
                    position: 'top-right'
                })
            })
            .catch((err) => {
                Notify.create({
                    message: err.response.data.datas,
                    color: 'negative',
                    textColor: 'white',
                    position: 'top-right'
                })
            })
        }

        const removeSection = (index) => {
            
            editSections.value.splice(index, 1)
        }

        const cleanErrors = () => {
            errors.locale = ''
            errors.language = ''
            errors.auditType = ''
            errors.vulnType = ''
            errors.vulnCat = ''
            errors.fieldLabel = ''
            errors.fieldType = ''
            errors.sectionField = ''
            errors.sectionName = ''
        }

        onMounted(() => {
            getTemplates()
            getLanguages()
            getAuditTypes()
            getVulnerabilityTypes()
            getVulnerabilityCategories()
            getCustomFields()
            getSections()
        })
        

        return {
            t,
            user,
            isAllowed,
            templates,
            languages,
            newLanguage,
            editLanguages,
            editLanguage,
            auditTypes,
            newAuditType,
            editAuditTypes,
            editAuditType,
            vulnTypes,
            newVulnType,
            editVulnTypes,
            editVulnType,
            vulnCategories,
            newVulnCat,
            editCategories,
            editCategory,
            customFields,
            newCustomField,
            cfLocale,
            newCustomOption,
            sections,
            newSection,
            editSections,
            editSection,
            errors,
            selectedTab,
            sortValueOptions,
            sortOrderOptions,
            cfDisplayOptions,
            cfComponentOptions,
            filteredCustomFields,
            newCustomFieldLangOptions,
            getTemplates,
            requiredFieldsEmpty,
            getLanguages,
            createLanguage,
            updateLanguages,
            removeLanguage,
            getAuditTypes,
            createAuditType,
            updateAuditTypes,
            removeAuditType,
            getTemplateOptionsLanguage,
            getVulnerabilityTypes,
            createVulnerabilityType,
            updateVulnTypes,
            removeVulnType,
            getVulnerabilityCategories,
            createVulnerabilityCategory,
            updateVulnCategories,
            removeCategory,
            getSortOptions,
            getCustomFields,
            createCustomField,
            deleteCustomField,
            canDisplayCustomField,
            canDisplayCustomFields,
            getFieldLocaleText,
            addCustomFieldOption,
            removeCustomFieldOption,
            getOptionsGroup,
            getFieldLangOptions,
            getSections,
            createSection,
            updateSections,
            removeSection,
            cleanErrors,
            updateCustomFields,
            _,
            locale,
            Utils
        }
    }
}
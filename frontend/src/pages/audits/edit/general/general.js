import { Notify, Dialog, QSpinnerGears } from 'quasar';
import Breadcrumb from 'components/breadcrumb';
import TextareaArray from 'components/textarea-array';
import BasicEditor from 'components/editor';
import CustomFields from 'components/custom-fields';
import AuditService from '@/services/audit';
import ClientService from '@/services/client';
import CompanyService from '@/services/company';
import CollabService from '@/services/collaborator';
import ReviewerService from '@/services/reviewer';
import TemplateService from '@/services/template';
import DataService from '@/services/data';
import { user } from '@/services/user';
import Utils from '@/services/utils';
import AttachmentService from '@/services/attachment';
import { useI18n } from 'vue-i18n';
import { ref, reactive, onMounted, onUnmounted, nextTick, getCurrentInstance } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import _ from 'lodash';
import {settings} from '@/boot/settings';
import { socket } from '@/boot/socketio';

export default {
  props: {
    frontEndAuditState: Number,
    parentState: String,
    parentApprovals: Array,
  },
  setup(props) {
    const { t } = useI18n();
    const { proxy } = getCurrentInstance();

    const auditId = ref(null);
    const audit = reactive({
      creator: {},
      name: '',
      location: '',
      auditType: '',
      client: {},
      company: {},
      collaborators: [],
      reviewers: [],
      date: '',
      date_start: '',
      date_end: '',
      scope: [''],
      language: '',
      template: '',
      customFields: [],
      approvals: [],
      attachments: [],
    });
    const selectedTab = ref('general');
    const auditOrig = ref({});
    const files = ref([]);
    const clients = ref([]);
    const selectClients = ref([]);
    const collaborators = ref([]);
    const reviewers = ref([]);
    const companies = ref([]);
    const selectCompanies = ref([]);
    const templates = ref([]);
    const languages = ref([]);
    const auditTypes = ref([]);
    const customFields = ref([]);
    const attachments = ref([]);
    const loading = ref(true);
    const AUDIT_VIEW_STATE = Utils.AUDIT_VIEW_STATE;
    const frontEndAuditState = ref(Utils.AUDIT_VIEW_STATE.EDIT);
    const columns = ref([
      {
        name: 'filename',
        label: 'Filename',
        field: 'filename',
        align: 'left'
      },
      {
          name: 'actions',
          label: 'Actions',
          field: 'actions',
          align: 'center'
      },
      {
        name: '_id',
        label: 'ID',
        field: '_id',
        align: 'left',
      },
      {
        name: 'length',
        label: 'Length',
        field: 'length',
        align: 'right',
      },
      {
        name: 'chunkSize',
        label: 'Chunk Size',
        field: 'chunkSize',
        align: 'right',
      },
      {
        name: 'uploadDate',
        label: 'Upload Date',
        field: 'uploadDate',
        align: 'left',
      },

    ]);

    const getAuditGeneral = async () => {
      try {
        const customFieldsData = await DataService.getCustomFields();
        customFields.value = customFieldsData.data.datas;
        await getAudit();
      } catch (err) {
        console.log(err.response);
      }
    };

    const getAudit = async () => {
      loading.value = true;
      getCollaborators();
      getReviewers();
      getClients();
      try {
        const data = await AuditService.getAudit(auditId.value);
        Object.assign(audit, data.data.datas);
        auditOrig.value = _.cloneDeep(audit);
      } catch (err) {
        console.log(err);
      }
    };

    const updateAuditGeneral = async () => {
      Utils.syncEditors(proxy.$refs);
      await nextTick();
      var customFieldsEmpty = proxy.$refs.customfields && proxy.$refs.customfields.requiredFieldsEmpty()
      var defaultFieldsEmpty = proxy.requiredFieldsEmpty()
      if (customFieldsEmpty || defaultFieldsEmpty) {
        Notify.create({
            message: t('msg.fieldRequired'),
            color: 'negative',
            textColor:'white',
            position: 'top-right'
        })
        return
    }
      try {
        await AuditService.updateAuditGeneral(auditId.value, audit);
        auditOrig.value = _.cloneDeep(audit);
        Notify.create({
          message: t('msg.auditUpdateOk'),
          color: 'positive',
          textColor: 'white',
          position: 'top-right',
        });
        getAuditGeneral();
      } catch (err) {
        Notify.create({
          message: err.response.data.datas,
          color: 'negative',
          textColor: 'white',
          position: 'top-right',
        });
      }
    };

    const getClients = async () => {
      try {
        const data = await ClientService.getClients();
        clients.value = data.data.datas;
        getCompanies();
      } catch (err) {
        console.log(err);
      }
    };

    const getCompanies = async () => {
      try {
        const data = await CompanyService.getCompanies();
        companies.value = data.data.datas;
        filterClients('init');
      } catch (err) {
        console.log(err);
      }
    };

    const getCollaborators = async () => {
      try {
        const data = await CollabService.getCollabs();
        const creatorId = audit.creator?._id || '';
        collaborators.value = data.data.datas.filter(e => e._id !== creatorId);
      } catch (err) {
        console.log(err);
      }
    };

    const getReviewers = async () => {
      try {
        const data = await ReviewerService.getReviewers();
        const creatorId = audit.creator?._id || '';
        reviewers.value = data.data.datas.filter(e => e._id !== creatorId);
      } catch (err) {
        console.log(err);
      }
    };

    const getTemplates = async () => {
      try {
        const data = await TemplateService.getTemplates();
        templates.value = data.data.datas;
      } catch (err) {
        console.log(err);
      }
    };

    const getLanguages = async () => {
      try {
        const data = await DataService.getLanguages();
        languages.value = data.data.datas;
      } catch (err) {
        console.log(err);
      }
    };

    const getAuditTypes = async () => {
      try {
        const data = await DataService.getAuditTypes();
        auditTypes.value = data.data.datas;
      } catch (err) {
        console.log(err);
      }
    };

    const filterClients = (step) => {
      if (step !== 'init') audit.client = null;
      if (audit.company?.name) {
        selectClients.value = clients.value.filter(client => client.company?.name === audit.company.name);
      } else {
        selectClients.value = _.clone(clients.value);
      }
    };

    const setCompanyFromClient = (value) => {
      if (value && !value.company) {
        audit.company = null;
      } else if (value) {
        audit.company = companies.value.find(company => company.name === value.company.name) || null;
      }
    };

    const createSelectCompany = (val, done) => {
      const index = companies.value.findIndex(e => Utils.normalizeString(e.name) === Utils.normalizeString(val));
      if (index > -1) {
        done(companies.value[index], 'add-unique');
      } else {
        done({ name: val }, 'add-unique');
      }
    };

    const filterSelectCompany = (val, update) => {
      if (val === '') {
        update(() => selectCompanies.value = companies.value);
        return;
      }
      update(() => {
        const needle = Utils.normalizeString(val);
        selectCompanies.value = companies.value.filter(v => Utils.normalizeString(v.name).indexOf(needle) > -1);
      });
    };

    const displayHighlightWarning = () => {
      if (!settings.report.enabled || !settings.report.public.highlightWarning) return null;

      const matchString = `(<mark data-color="${settings.report.public.highlightWarningColor}".+?>.+?)</mark>`;
      const regex = new RegExp(matchString);

      if (audit.customFields?.length > 0) {
        for (const field of audit.customFields) {
          if (field.customField?.fieldType === 'text' && field.text) {
            const result = regex.exec(field.text);
            if (result?.[1]) {
              return result[1].length > 119 ? `<b>${field.customField.label}</b><br/>${result[1].substring(0, 119)}...` : `<b>${field.customField.label}</b><br/>${result[1]}`;
            }
          }
        }
      }

      return null;
    };

    const requiredFieldsEmpty = () => {
        proxy.$refs.nameField.validate()
        proxy.$refs.companyField.validate()
        proxy.$refs.clientField.validate()
        proxy.$refs.dateStartField.validate()
        proxy.$refs.dateEndField.validate()
        proxy.$refs.dateReportField.validate()
        proxy.$refs.scopeField.validate()

        return (
            proxy.$refs.nameField.hasError ||
            proxy.$refs.companyField.hasError ||
            proxy.$refs.clientField.hasError ||
            proxy.$refs.dateStartField.hasError ||
            proxy.$refs.dateEndField.hasError ||
            proxy.$refs.dateReportField.hasError ||
            proxy.$refs.scopeField.hasError
        )
    }

    const updateFiles = (event) => {
      // Convert FileList to an array
      const newFiles = Array.from(event);

      files.value = newFiles;

      const promises = files.value.map(file => {
          return new Promise((resolve, reject) => {
              const downloadNotif = Notify.create({
                  spinner: QSpinnerGears,
                  message: `Uploading ${file.name}`,
                  color: 'blue',
                  timeout: 0,
                  group: false,
              });

              const attachment = { name: file.name };
              const fileReader = new FileReader();
              fileReader.readAsDataURL(file);

              fileReader.onloadend = () => {
                  attachment.value = fileReader.result.split(',')[1];
                  resolve({ attachment, downloadNotif });
              };

              fileReader.onerror = reject;
          });
      });

      Promise.all(promises)
          .then(results => {
              results.forEach(({ attachment, downloadNotif }) => {
                  audit.attachments.push(attachment);
                  downloadNotif({
                      icon: 'done',
                      spinner: false,
                      message: `${attachment.name} successfully uploaded`,
                      color: 'green',
                      timeout: 3000,
                  });
              });
              updateAuditGeneral();
              files.value = null;

          })
          .catch(console.log);
          
  };

    const deleteDocument = async (index) => {
      try {
        await AttachmentService.deleteAttachment(auditId.value, index._id);
        updateAuditGeneral();
        printPositiveMessage('Attachment ' + index.filename + ' successfully deleted');
      } catch (err) {
        console.log(err);
        printNegativeMessage(err.response.data.datas);
      }
    };

    const downloadDocument = async (index) => {
      try {
        const attachmentData = await AttachmentService.getAttachment(auditId.value, index._id);
        const file = attachmentData.data.datas;
        const blob = new Blob([Uint8Array.from(atob(file.value), c => c.charCodeAt(0))], {type: "application/octet-stream"});
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        printPositiveMessage('Attachment ' + index.filename + ' successfully downloaded');
        files.value = null;
      } catch (err) {
        printNegativeMessage(err.response.data.datas);
      }
    };

    const printPositiveMessage = (message) => {
      Notify.create({
        message: t(message),
        type: 'positive',
        position: 'top-right',
        iconSize: '64px',
        iconColor: 'white',
        timeout: '5000',
      });
    };

    const printNegativeMessage = (message) => {
      Notify.create({
        message: t(message),
        type: 'negative',
        position: 'top-right',
        iconSize: '100px',
        iconColor: 'white',
        timeout: '7000',
      });
    };

    const _listener = (e) => {
      if ((window.navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey) && e.keyCode === 83) {
        e.preventDefault();
        if (props.frontEndAuditState === AUDIT_VIEW_STATE.EDIT) updateAuditGeneral();
      }
    };

    onMounted(() => {
      auditId.value = proxy.$route.params.auditId;
      getAuditGeneral();
      getTemplates();
      getLanguages();
      getAuditTypes();
      socket.emit('menu', { menu: 'general', room: auditId.value });
      document.addEventListener('keydown', _listener, false);
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', _listener, false);
    });

    onBeforeRouteLeave((to, from , next) => {
      Utils.syncEditors(proxy.$refs)
      
      if (!_.isEqual(audit, auditOrig.value)){
          Dialog.create({
              title: t('msg.thereAreUnsavedChanges'),
              message: t('msg.doYouWantToLeave'),
              ok: {label: t('btn.confirm'), color: 'positive'},
              cancel: {label: t('btn.cancel'), color: 'negative'},
              focus: 'cancel'
          })
          .onOk(() => next())
      }
      else
          next()
    });

    return {
      t,
      audit,
      auditOrig,
      clients,
      selectClients,
      collaborators,
      reviewers,
      companies,
      selectCompanies,
      templates,
      languages,
      auditTypes,
      attachments,
      customFields,
      settings,
      loading,
      selectedTab,
      AUDIT_VIEW_STATE,
      frontEndAuditState,
      columns,
      getAuditGeneral,
      updateAuditGeneral,
      getClients,
      getCompanies,
      getCollaborators,
      getReviewers,
      getTemplates,
      getLanguages,
      getAuditTypes,
      filterClients,
      setCompanyFromClient,
      createSelectCompany,
      filterSelectCompany,
      displayHighlightWarning,
      updateFiles,
      deleteDocument,
      downloadDocument,
      printPositiveMessage,
      printNegativeMessage,
      requiredFieldsEmpty
    };
  },
  components: {
    Breadcrumb,
    TextareaArray,
    CustomFields,
    BasicEditor,
  },
};
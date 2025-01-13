import { Notify } from 'quasar';
import { ref, reactive, computed, onMounted, watch, getCurrentInstance } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import _ from 'lodash';

import Breadcrumb from 'components/breadcrumb';
import VulnService from '@/services/vulnerability';
import AuditService from '@/services/audit';
import DataService from '@/services/data';
import Utils from '@/services/utils';
import {settings} from '@/boot/settings';
import { socket } from '@/boot/socketio';

export default {
  components: {
    Breadcrumb,
  },
  props: {
    frontEndAuditState: Number,
    parentState: String,
    parentApprovals: Array,
    parentAudit: Object,
    parentCustomFields: Array,
  },
  setup(props) {
    const { t } = useI18n();
    const route = useRoute();
    const { proxy } = getCurrentInstance();
    const audit = computed(() => proxy.$parent.$parent.audit);
    const auditId = ref(route.params.auditId);
    const finding = reactive({});
    const findingTitle = ref('');
    const vulnerabilities = ref([]);
    const loading = ref(true);
    const vulnPagination = reactive({
      page: 1,
      rowsPerPage: 25,
      sortBy: 'title',
    });
    const rowsPerPageOptions = ref([
      { label: '25', value: 25 },
      { label: '50', value: 50 },
      { label: '100', value: 100 },
      { label: 'All', value: 0 },
    ]);
    const filteredRowsCount = ref(0);
    const search = reactive({ title: '', category: '' });
    const languages = ref([{ locale: 'en', language: 'English' }]);
    const dtLanguage = ref('');
    const currentExpand = ref(-1);
    const vulnCategories = ref([]);
    const htmlEncode = Utils.htmlEncode;
    const AUDIT_VIEW_STATE = Utils.AUDIT_VIEW_STATE;


    const dtVulnHeaders = computed(() => [
      { name: 'title', label: t('title'), field: (row) => row.detail.title, align: 'left', sortable: true },
      { name: 'category', label: t('category'), field: 'category', align: 'left', sortable: true },
      { name: 'action', label: '', field: 'action', align: 'left', sortable: false },
    ]);

    const vulnCategoriesOptions = computed(() => _.uniq(_.map(vulnerabilities.value, (vuln) => vuln.category)));
    const vulnTypeOptions = computed(() => _.uniq(_.map(vulnerabilities.value, (vuln) => vuln.detail.vulnType || t('undefined'))));

    const pagesNumber = computed(() => {
      return Math.ceil(filteredRowsCount.value / vulnPagination.rowsPerPage);
    });

    const getLanguages = async () => {
      try {
        const data = await DataService.getLanguages();
        languages.value = data.data.datas;
        if (languages.value.length > 0) {
          dtLanguage.value = languages.value[0].locale
        }
      } catch (err) {
        console.log(err);
      }
    };

    const getVulnerabilities = async () => {
      loading.value = true;
      try {
        const data = await VulnService.getVulnByLanguage(languages.value[0].locale);
        vulnerabilities.value = data.data.datas;
        loading.value = false;
      } catch (err) {
        console.log(err);
      }
    };

    const getVulnerabilityCategories = async () => {
      try {
        const data = await DataService.getVulnerabilityCategories();
        vulnCategories.value = data.data.datas;
      } catch (err) {
        console.log(err);
      }
    };

    const getDtTitle = (row) => {
      const index = row.details.findIndex((obj) => obj.locale === dtLanguage.value.locale);
      if (index < 0) return t('err.notDefinedLanguage');
      return row.details[index].title;
    };

    const customFilter = (rows, terms, cols, getCellValue) => {
      const result = rows.filter((row) => {
        const title = (row.detail.title || t('err.notDefinedLanguage')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const type = (row.detail.vulnType || t('undefined')).toLowerCase();
        const category = row.category;
        const termTitle = (terms.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const termCategory = (terms.category || '').toLowerCase();
        const termVulnType = (terms.vulnType || '').toLowerCase();
        return title.includes(termTitle) && type?.includes(termVulnType) && category?.includes(termCategory);
      });
      filteredRowsCount.value = result.length;
      return result;
    };

    const addFindingFromVuln = async (vuln) => {
      let finding = null;
      if (vuln) {
        finding = {
          title: vuln.detail.title,
          vulnType: vuln.detail.vulnType,
          description: vuln.detail.description,
          observation: vuln.detail.observation,
          remediation: vuln.detail.remediation,
          remediationComplexity: vuln.remediationComplexity,
          priority: vuln.priority,
          references: vuln.detail.references,
          cvssv3: vuln.cvssv3,
          category: vuln.category,
          customFields: Utils.filterCustomFields('finding', vuln.category, props.parentCustomFields, vuln.detail.customFields, languages.value),
        };
      }

      if (finding) {
        try {
          await AuditService.createFinding(auditId.value, finding);
          findingTitle.value = '';
          Notify.create({
            message: t('msg.findingCreateOk'),
            color: 'positive',
            textColor: 'white',
            position: 'top-right',
          });
        } catch (err) {
          Notify.create({
            message: err.response.data.datas,
            color: 'negative',
            textColor: 'white',
            position: 'top-right',
          });
        }
      }
    };

    const addFinding = async (category) => {
      let finding = null;
      if (category && findingTitle.value) {
        finding = {
          title: findingTitle.value,
          vulnType: "",
          description: "",
          observation: "",
          remediation: "",
          remediationComplexity: "",
          priority: "",
          references: [],
          cvssv3: "",
          category: category.name,
          customFields: Utils.filterCustomFields('finding', category.name, props.parentCustomFields, [], languages.value),
        };
      } else if (findingTitle.value) {
        finding = {
          title: findingTitle.value,
          vulnType: "",
          description: "",
          observation: "",
          remediation: "",
          remediationComplexity: "",
          priority: "",
          references: [],
          cvssv3: "",
          customFields: Utils.filterCustomFields('finding', '', props.parentCustomFields, [], languages.value),
        };
      }

      if (finding) {
        try {
          await AuditService.createFinding(auditId.value, finding);
          findingTitle.value = '';
          Notify.create({
            message: t('msg.findingCreateOk'),
            color: 'positive',
            textColor: 'white',
            position: 'top-right',
          });
        } catch (err) {
          Notify.create({
            message: err.response.data.datas,
            color: 'negative',
            textColor: 'white',
            position: 'top-right',
          });
        }
      }
    };

    watch(

    );

    onMounted(() => {
      getLanguages();
      getVulnerabilities();
      getVulnerabilityCategories();
      socket.emit('menu', { menu: 'addFindings', room: auditId.value });
    });

    return {
      t,
      auditId,
      audit,
      finding,
      findingTitle,
      vulnerabilities,
      loading,
      vulnPagination,
      rowsPerPageOptions,
      filteredRowsCount,
      search,
      settings,
      languages,
      dtLanguage,
      currentExpand,
      vulnCategories,
      htmlEncode,
      AUDIT_VIEW_STATE,
      dtVulnHeaders,
      vulnCategoriesOptions,
      vulnTypeOptions,
      pagesNumber,
      getLanguages,
      getVulnerabilities,
      getVulnerabilityCategories,
      getDtTitle,
      customFilter,
      addFindingFromVuln,
      addFinding,
    };
  },
};
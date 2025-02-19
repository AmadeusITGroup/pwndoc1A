<template>
    <div>
      <div class="row">
        <div v-if="languages.length === 0" class="col-md-4 offset-md-4 q-mt-md">
          <p>{{ t('noLanguage') }}<a href="/data/custom">{{ t('nav.data') }} -> {{ t('customData') }} -> {{ t('language') }}</a></p>
        </div>
        <div v-if="auditTypes.length === 0" class="col-md-4 offset-md-4 q-mt-md">
          <p>{{ t('noAudit') }}<a href="/data/custom">{{ t('nav.data') }} -> {{ t('customData') }} -> {{ t('auditTypes') }}</a></p>
        </div>
        <div v-if="languages.length > 0 && auditTypes.length > 0" class="col-md-8 col-12 offset-md-2 q-mt-md">
          <q-table
            :columns="dtHeaders"
            :visible-columns="visibleColumns"
            :rows="audits || []"
            :filter="search"
            :filter-method="customFilter"
            v-model:pagination="pagination"
            row-key="_id"
            separator="none"
            :loading="loading"
            @row-dblclick="dblClick"
          >
            <template v-slot:top>
              <q-input
                class="col-md-3"
                :label="t('Search')"
                v-model="search.finding"
                @keyup.enter="getAudits"
                outlined
                clearable
              >
                <template v-slot:append>
                  <q-btn flat icon="search" @click="getAudits" />
                  <q-icon v-if="search.finding" name="cancel" @click.stop="search.finding = null; getAudits()" class="cursor-pointer" />
                </template>
              </q-input>
              <q-toggle :label="t('myAudits')" v-model="myAudits" />
              <q-toggle v-if="isAllowed('audits:users-connected')" :label="t('usersConnected')" v-model="displayConnected" />
              <q-toggle v-if="settings?.reviews?.enabled && (isAllowed('audits:review') || isAllowed('audits:review-all'))" :label="t('awaitingMyReview')" v-model="displayReadyForReview" />
              <q-space />
              <q-btn 
                color="secondary"
                unelevated
                :label="t('newAudit')"
                no-caps
                @click="cleanCurrentAudit(); $refs.createModal.show()"
              />    
            </template>
            <template v-slot:body-cell-language="props">
              <q-td>
                {{ props.row && props.row.language ? convertLocale(props.row.language) : '-' }}
              </q-td>
            </template>
            <template v-slot:body-cell-users="props">
              <q-td>
                {{ props.row ? convertParticipants(props.row) : '-' }}
              </q-td>
            </template>
            <template v-slot:body-cell-connected="props">
              <q-td>
                <q-chip v-if="isAllowed('audits:users-connected') && props.row.connected && props.row.connected.length > 0" square size="11px">
                  <q-avatar color="green" text-color="white">{{ props.row.connected.length }}</q-avatar>
                  {{t('users')}}
                  <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">
                    {{t('tooltip.usersConnected')}}
                    <div v-for="(user, idx) in props.row.connected" :key="idx">
                      {{ user }}
                    </div>
                  </q-tooltip>
                </q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-reviews="props">
              <q-td>
                <audit-state-icon v-if="props.row && settings?.reviews?.enabled" :approvals="props.row.approvals" :state="props.row.state" />
              </q-td>
            </template>
            <template v-slot:body-cell-action="props">
              <q-td style="width:1px">
                <q-btn size="sm" flat color="primary" :to="'/audits/' + props.row._id" icon="fa fa-edit" v-if="props.row">
                  <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{ t('tooltip.editAudit') }}</q-tooltip> 
                </q-btn>
                <q-btn size="sm" flat color="info" @click="generateReport(props.row)" icon="fa fa-download" v-if="props.row">
                  <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{ t('tooltip.downloadReport') }}</q-tooltip> 
                </q-btn>
                <q-btn size="sm" flat color="negative" @click="confirmDeleteAudit(props.row)" icon="fa fa-trash" v-if="props.row">
                  <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{ t('tooltip.deleteAudit') }}</q-tooltip> 
                </q-btn>
              </q-td>
            </template>
  
            <template v-slot:bottom="scope">
              <span v-if="audits.length === 1">1 {{ t('auditNum1') }}</span>                
              <span v-else>{{ audits.length }} {{ t('auditNums') }}</span> 
              <q-space />
              <span>{{ t('resultsPerPage') }}</span>
              <q-select
                class="q-px-md"
                v-model="pagination.rowsPerPage"
                :options="rowsPerPageOptions"
                emit-value
                map-options
                dense
                options-dense
                options-cover
                borderless
              />
              <q-pagination input v-model="pagination.page" :max="scope.pagesNumber" />            
            </template>
          </q-table>
        </div>
      </div>
      
      <q-dialog ref="createModal" persistent @hide="cleanCurrentAudit">
        <q-card style="width:800px">
          <q-bar class="bg-fixed-primary text-white">
            <div class="q-toolbar-title">{{ t('createAudit') }}</div>
            <q-space />
            <q-btn dense flat icon="close" @click="$refs.createModal.hide()" />
          </q-bar>
          <q-card-section>
            <q-input
              :label="`${t('name')} *`"
              :error="!!errors.name"
              :error-message="errors.name"
              autofocus
              @keyup.enter="createAudit()"
              v-model="currentAudit.name"
              outlined
            />
            <q-select
              :label="`${t('selectAssessment')} *`"
              :error="!!errors.auditType"
              :error-message="errors.auditType"
              v-model="currentAudit.auditType"
              :options="auditTypes"
              option-value="name"
              option-label="name"
              emit-value
              map-options
              options-sanitize
              outlined
            /> 
            <q-select 
              :label="`${t('selectLanguage')} *`"
              :error="!!errors.language"
              :error-message="errors.language"
              v-model="currentAudit.language"
              :options="languages"
              option-value="locale"
              option-label="language"
              emit-value
              map-options
              options-sanitize
              outlined
            />
          </q-card-section>
  
          <q-separator />
  
          <q-card-actions align="right">
            <q-btn color="primary" outline @click="$refs.createModal.hide()">{{t('btn.cancel')}}</q-btn>
            <q-btn color="secondary" unelevated @click="createAudit()">{{t('btn.create')}}</q-btn>
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </template>

<script>
import { ref, reactive, computed, onMounted, getCurrentInstance, watch, isRef } from 'vue';
import { Dialog, Notify, QSpinnerGears } from 'quasar';

import AuditStateIcon from 'components/audit-state-icon';
import Breadcrumb from 'components/breadcrumb';

import AuditService from '@/services/audit';
import DataService from '@/services/data';
import CompanyService from '@/services/company';
import {user, isAllowed} from '@/services/user';
import { useI18n } from 'vue-i18n';
import {settings} from '@/boot/settings'

export default {
  setup() {
    const { t } = useI18n();
    const { proxy } = getCurrentInstance();

    const audits = ref([]);
    const auditsAllowed = ref([]);
    const loading = ref(true);
    const auditTypes = ref([]);
    const companies = ref([]);
    const languages = ref([]);
    const visibleColumns = ref(['name', 'auditType', 'language', 'company', 'users', 'date', 'action']);
    const pagination = ref({
      page: 1,
      rowsPerPage: 25,
      sortBy: 'date',
      descending: true,
    });
    const rowsPerPageOptions = [
      { label: '25', value: 25 },
      { label: '50', value: 50 },
      { label: '100', value: 100 },
      { label: 'All', value: 0 },
    ];
    const search = reactive({ filter: '' });
    const myAudits = ref(false);
    const displayConnected = ref(false);
    const displayReadyForReview = ref(false);
    const errors = reactive({ name: '', language: '', auditType: '' });
    const currentAudit = reactive({ name: '', auditType: '' });
    const internalAudits = ref(false);
    const externalAudits = ref(false);

    const dtHeaders = computed(() => [
        {name: 'name', label: t('name'), field: 'name', align: 'left', sortable: true},
        {name: 'auditType', label: t('auditType'), field: 'auditType', align: 'left', sortable: true},
        {name: 'language', label: t('language'), field: 'language', align: 'left', sortable: true},
        {name: 'company', label: t('company'), field: row => (row.company)?row.company.name:'', align: 'left', sortable: true},
        {name: 'users', label: t('participants'), align: 'left', sortable: true},
        {name: 'date', label: t('date'), field: row => row.createdAt?.split('T')[0], align: 'left', sortable: true},
        {name: 'connected', label: '', align: 'left', sortable: false},
        {name: 'reviews', label: '', align: 'left', sortable: false},
        {name: 'action', label: '', field: 'action', align: 'left', sortable: false},
    ]);
    const modalAuditTypes = computed (() => {return this.auditTypes.filter(type => type.stage === currentAudit.type)})

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

    const getCompanies = async () => {
      try {
        const data = await CompanyService.getCompanies();
        companies.value = data.data.datas;
      } catch (err) {
        console.log(err);
      }
    };

    const getAudits = async () => {
      loading.value = true;
      try {
        const data = await AuditService.getAudits(search.finding);
        audits.value = data.data.datas;
        loading.value = false;
      } catch (err) {
        loading.value = false
        console.log(err);
      }
    };

    const createAudit = async () => {
      cleanErrors();
      if (!currentAudit.name) errors.name = 'Name required';
      if (!currentAudit.language) errors.language = "Language required";
      if (!currentAudit.auditType) errors.auditType = 'Assessment required';
      if (errors.name || errors.auditType) return;

      try {
        const response = await AuditService.createAudit(currentAudit);
        proxy.$refs.createModal.hide();
        proxy.$router.push('/audits/' + response.data.datas.audit._id + '/general');
      } catch (err) {
        Notify.create({
          message: err.response.data.datas,
          color: 'negative',
          textColor: 'white',
          position: 'top-right',
        });
      }
    };

    const deleteAudit = async uuid => {
      try {
        await AuditService.deleteAudit(uuid);
        getAudits();
        Notify.create({
          message: 'Audit deleted successfully',
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
    };

    const confirmDeleteAudit = audit => {
      Dialog.create({
        title: 'Confirm Suppression',
        message: `Audit «${audit.name}» will be permanently deleted`,
        ok: { label: 'Confirm', color: 'positive' },
        cancel: { label: 'Cancel', color: 'negative' },
      }).onOk(() => deleteAudit(audit._id));
    };

    const BlobReader = data => {
      const fileReader = new FileReader();

      return new Promise((resolve, reject) => {
        fileReader.onerror = () => {
          fileReader.abort();
          reject(new Error('Problem parsing blob'));
        };

        fileReader.onload = () => {
          resolve(fileReader.result);
        };

        fileReader.readAsText(data);
      });
    };

    const generateReport = async (row) => {
      const downloadNotif = Notify.create({
        spinner: QSpinnerGears,
        message: 'Generating the Report',
        color: 'blue',
        timeout: 0,
        group: false,
      });
      try {
        const data = await AuditService.generateAuditReport(row._id);
			  var blob = new Blob([data.data], {type: "application/octet-stream"});
        var link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        const title = row.name.concat('_', 'report', '.docx');
        link.download = title;
        document.body.appendChild(link);
        link.click();
        link.remove();
        downloadNotif({
          icon: 'done',
          spinner: false,
          message: 'Report successfully generated',
          color: 'green',
          timeout: 2500,
        });
      } catch (err) {
        var message = 'Error generating template';
        if (err.response && err.response.data) {
          var blob = new Blob([err.response.data], { type: 'application/json' });
          var blobData = await BlobReader(blob);
          message = JSON.parse(blobData).datas;
        }
        downloadNotif();
        Notify.create({
          message: message,
          type: 'negative',
          textColor: 'white',
          position: 'top',
          closeBtn: true,
          timeout: 0,
          classes: 'text-pre-wrap',
        });
      }
    };

    const cleanErrors = () => {
      errors.name = '';
      errors.language = '';
      errors.auditType = '';
    };

    const cleanCurrentAudit = () => {
      cleanErrors();
      currentAudit.name = '';
      currentAudit.language = '';
      currentAudit.auditType = '';
    };

    const convertLocale = locale => {
      for (var i = 0; i < languages.value.length; i++) {
        if (languages.value[i].locale === locale) return languages.value[i].language;
      }
      return '';
    };

    const convertParticipants = row => {
      var collabs = row.collaborators ? row.collaborators : [];
      var result = row.creator ? [row.creator.username] : [];
      collabs.forEach(collab => result.push(collab.username));
      return result.join(', ');
    };

    const customFilter = (rows, terms, cols, getCellValue) => {
        var username = user.value.username.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        var nameTerm = (terms.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        var auditTypeTerm = (terms.auditType || "").toLowerCase()
        var languageTerm = (terms.language)? terms.language.toLowerCase(): ""
        var companyTerm = (terms.company)? terms.company.toLowerCase(): ""
        var usersTerm = (terms.users || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        var dateTerm = (terms.date)? terms.date.toLowerCase(): ""


      return (
        rows &&
        rows.filter(row => {
            var name = (row.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            var auditType = (row.auditType || "").toLowerCase()
            var language = (row.language)? row.language.toLowerCase(): ""
            var companyName = (row.company)? row.company.name.toLowerCase(): ""
            var users = convertParticipants(row).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            var date = (row.createdAt)? row.createdAt.split('T')[0]: "";


          return (
            !auditTypeTerm || auditTypeTerm === auditType) &&
                    language.indexOf(languageTerm) > -1 &&
                    (!companyTerm || companyTerm === companyName) &&
                    users.indexOf(usersTerm) > -1 &&
                    date.indexOf(dateTerm) > -1 &&
                    ((myAudits.value && users.indexOf(username) > -1) || !myAudits.value) &&
                    ((displayConnected.value && row.connected && row.connected.length > 0) || !displayConnected.value) &&
                    ((displayReadyForReview.value && users.indexOf(username) < 0 && row.state === 'REVIEW') || !displayReadyForReview.value)

        })
      );
    };

    const dblClick = (evt, row) => {
      proxy.$router.push('/audits/' + row._id + '/general');
    };

    onMounted(async () => {
      search.filter = proxy.$route.params.finding;
     

      await getAudits();
      await getLanguages();
      await getAuditTypes();
      await getCompanies();
      if (settings?.reviews?.enabled ?? false) {
        visibleColumns.value.push('reviews');
      }
      if (isAllowed('audits:users-connected'))
            visibleColumns.value.push('connected')
    });

    return {
      t,
      isAllowed,
      audits,
      loading,
      settings,
      auditTypes,
      companies,
      languages,
      visibleColumns,
      pagination,
      rowsPerPageOptions,
      search,
      myAudits,
      displayConnected,
      displayReadyForReview,
      errors,
      currentAudit,
      internalAudits,
      externalAudits,
      dtHeaders,
      getLanguages,
      getAuditTypes,
      modalAuditTypes,
      getCompanies,
      getAudits,
      createAudit,
      deleteAudit,
      confirmDeleteAudit,
      BlobReader,
      generateReport,
      cleanErrors,
      cleanCurrentAudit,
      convertLocale,
      convertParticipants,
      customFilter,
      dblClick,
    };
  },
  components: {
    AuditStateIcon,
    Breadcrumb,
  },
};
</script>

<style>
.icon-next-to-button {
    padding: 0 12px;
    font-size: 1.5em!important;
}
</style>
<template>
	<div>
	  <q-drawer side="left" :model-value="true" :width="400">
		<q-splitter horizontal v-model="splitterRatio" :limits="[50, 80]" style="height: 100%">
		  <template #before>
			<q-list class="home-drawer">
			  <q-item style="padding:0px">
				<q-item-section avatar v-if="audit.type === 'multi'">
				  <q-chip square size="md" outline color="green" :label="t('multi')" />
				</q-item-section>
				<q-item-section avatar v-else-if="audit.type === 'retest'">
				  <q-chip square outline color="orange" :label="t('retest')" />
				</q-item-section>
				<q-item-section avatar v-else>
				  <q-chip square size="md" outline color="info" :label="t('audit')" />
				</q-item-section>
				<q-item-section />
				<template v-if="audit.type == 'default'">
				  <q-item-section side>
					<q-btn
					  v-if="auditRetest"
					  class="q-mx-xs q-px-xs"
					  size="11px"
					  unelevated
					  dense
					  color="secondary"
					  :label="t('btn.topButtonSection.navigateRetest')"
					  no-caps
					  @click="goToAudit(auditRetest)"
					>
					  <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{t('tooltip.topButtonSection.navigateRetest')}}</q-tooltip>
					</q-btn>
					<q-btn
					  v-else
					  class="q-mx-xs q-px-xs"
					  size="11px"
					  unelevated
					  dense
					  color="secondary"
					  :label="t('btn.topButtonSection.createRetest')"
					  no-caps
					  @click="(auditTypesRetest && auditTypesRetest.length === 1) ? createRetest(auditTypesRetest[0]) : ''"
					>
					  <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{t('tooltip.topButtonSection.createRetest')}}</q-tooltip>
					  <q-menu content-style="width: 300px">
						<q-item clickable v-for="retest of auditTypesRetest" :key="retest.name">
						  <q-item-section @click="createRetest(retest)">
							{{ retest.name }}
						  </q-item-section>
						</q-item>
					  </q-menu>
					</q-btn>
				  </q-item-section>
				</template>
				<template v-if="settings?.reviews?.enabled">
				  <q-item-section side class="topButtonSection" v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT">
					<q-btn class="q-mx-xs q-px-xs" size="11px" unelevated dense color="secondary" :label="t('btn.topButtonSection.submitReview')" no-caps @click="toggleAskReview">
					  <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{t('tooltip.topButtonSection.submitReview')}}</q-tooltip>
					</q-btn>
				  </q-item-section>
				  <q-item-section side class="topButtonSection" v-if="[AUDIT_VIEW_STATE.REVIEW_EDITOR, AUDIT_VIEW_STATE.REVIEW_ADMIN, AUDIT_VIEW_STATE.REVIEW_ADMIN_APPROVED].includes(frontEndAuditState)">
					<q-btn class="q-mx-xs q-px-xs" size="11px" unelevated dense color="amber-9" :label="t('btn.topButtonSection.cancelReview')" no-caps @click="toggleAskReview">
					  <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{t('tooltip.topButtonSection.cancelReview')}}</q-tooltip>
					</q-btn>
				  </q-item-section>
				  <q-item-section side class="topButtonSection" v-if="[AUDIT_VIEW_STATE.REVIEW, AUDIT_VIEW_STATE.REVIEW_ADMIN].includes(frontEndAuditState)">
					<q-btn class="q-mx-xs q-px-xs" size="11px" unelevated dense color="green" :label="t('btn.topButtonSection.approve')" no-caps @click="toggleApproval">
					  <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{t('tooltip.topButtonSection.approve')}}</q-tooltip>
					</q-btn>
				  </q-item-section>
				  <q-item-section side class="topButtonSection" v-if="[AUDIT_VIEW_STATE.REVIEW_APPROVED, AUDIT_VIEW_STATE.REVIEW_ADMIN_APPROVED, AUDIT_VIEW_STATE.APPROVED_APPROVED].includes(frontEndAuditState)">
					<q-btn class="q-mx-xs q-px-xs" size="11px" unelevated dense color="warning" :label="t('btn.topButtonSection.removeApproval')" no-caps @click="toggleApproval">
					  <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{t('tooltip.topButtonSection.removeApproval')}}</q-tooltip>
					</q-btn>
				  </q-item-section>
				</template>
				<q-item-section side class="topButtonSection">
				  <q-btn flat color="info" @click="generateReport">
					<q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{t('tooltip.downloadReport')}}</q-tooltip>
					<i class="fa fa-download fa-lg"></i>
				  </q-btn>
				</q-item-section>
			  </q-item>
  
			  <q-item :to='"/audits/"+auditId+"/general"' active-class="custom-active-item" exact clickable>
				<q-item-section avatar>
				  <q-icon name="fa fa-cog"></q-icon>
				</q-item-section>
				<q-item-section>{{t('generalInformation')}}</q-item-section>
			  </q-item>
  
			  <div class="row">
				<div v-for="(user,idx) in generalUsers" :key="idx" class="col multi-colors-bar" :style="{background:user.color}" />
			  </div>
  
			  <q-item v-if="!currentAuditType || !currentAuditType.hidden.includes('network')" :to="'/audits/'+auditId+'/network'" active-class="custom-active-item">
				<q-item-section avatar>
				  <q-icon name="fa fa-globe"></q-icon>
				</q-item-section>
				<q-item-section>{{t('networkScan')}}</q-item-section>
			  </q-item>
  
			  <div class="row">
				<div v-for="(user,idx) in networkUsers" :key="idx" class="col multi-colors-bar" :style="{background:user.color}" />
			  </div>
  
			  <div v-if="!currentAuditType || !currentAuditType.hidden.includes('findings')">
				<q-separator class="q-my-sm" />
				<q-item>
				  <q-item-section avatar>
					<q-icon name="fa fa-list"></q-icon>
				  </q-item-section>
				  <q-item-section v-if="audit.type === 'multi'">{{t('audits')}} ({{audit.findings.length || 0}})</q-item-section>
				  <q-item-section v-else>{{t('findings')}} ({{audit.findings.length || 0}})</q-item-section>
				  <q-item-section avatar>
					<q-btn
					  @click="router.push('/audits/'+auditId+'/findings/add').catch(err=>{})"
					  icon="add"
					  round
					  dense
					  color="secondary"
					  v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT && audit.type === 'default'"
					/>
					<q-btn
					  @click="router.push('/audits/'+auditId+'/audits/add').catch(err=>{})"
					  icon="add"
					  round
					  dense
					  color="secondary"
					  v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT && audit.type === 'multi'"
					/>
				  </q-item-section>
				</q-item>
  
				<div v-if="audit.type === 'multi'">
				  <q-list no-border>
					<div class="q-mt-md"></div>
					<div v-for="audit of children" :key="audit._id">
					  <q-item dense clickable>
						<q-item-section @click="router.push(`/audits/${audit._id}`)">
						  <span>{{audit.name}} <b>({{audit.auditType}})</b></span>
						</q-item-section>
						<q-item-section side>
						  <q-btn
							v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT"
							size="sm"
							flat
							color="negative"
							@click="confirmDeleteParent(audit)" icon="fa fa-minus-circle"
						  >
							<q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{t('tooltip.removeAudit')}}</q-tooltip>
						  </q-btn>
						</q-item-section>
					  </q-item>
					</div>
				  </q-list>
				</div>
				<div v-else>
				  <div v-for="categoryFindings of findingList" :key="categoryFindings.category">
					<q-item>
					  <q-item-section>
						<q-item-label header>{{categoryFindings.category}}</q-item-label>
					  </q-item-section>
					  <q-item-section avatar>
						<q-btn icon="sort" flat v-if="frontEndAuditState === AUDIT_VIEW_STATE.EDIT">
						  <q-tooltip anchor="bottom middle" self="center left" :delay="500" content-class="text-bold">{{t('tooltip.sortOptions')}}</q-tooltip>
						  <q-menu content-style="width: 300px" anchor="bottom middle" self="top left">
							<q-item>
							  <q-item-section>
								<q-toggle
								  v-model="categoryFindings.sortOption.sortAuto"
								  :label="t('automaticSorting')"
								  @input="updateSortFindings"
								/>
							  </q-item-section>
							</q-item>
							<q-separator />
							<q-item>
							  <q-item-section>
								<q-item-label>{{t('sortBy')}}</q-item-label>
							  </q-item-section>
							</q-item>
							<q-item>
							  <q-item-section>
								<q-option-group
								  v-model="categoryFindings.sortOption.sortValue"
								  :options="getSortOptions(categoryFindings.sortOption.category)"
								  type="radio"
								  :disable="!categoryFindings.sortOption.sortAuto"
								  @input="updateSortFindings"
								/>
							  </q-item-section>
							</q-item>
							<q-separator />
							<q-item>
							  <q-item-section>
								<q-btn
								  flat
								  icon="fa fa-long-arrow-alt-up"
								  :label="t('ascending')"
								  dense
								  no-caps
								  align="left"
								  :disable="!categoryFindings.sortOption.sortAuto"
								  :color="(categoryFindings.sortOption.sortOrder === 'asc')?'green':''"
								  @click="categoryFindings.sortOption.sortOrder = 'asc'; updateSortFindings()"
								/>
							  </q-item-section>
							</q-item>
							<q-item>
							  <q-item-section>
								<q-btn
								  flat
								  icon="fa fa-long-arrow-alt-down"
								  :label="t('descending')"
								  dense
								  no-caps
								  align="left"
								  :disable="!categoryFindings.sortOption.sortAuto"
								  :color="(categoryFindings.sortOption.sortOrder === 'desc')?'green':''"
								  @click="categoryFindings.sortOption.sortOrder = 'desc'; updateSortFindings()"
								/>
							  </q-item-section>
							</q-item>
						  </q-menu>
						</q-btn>
					  </q-item-section>
					</q-item>
					<q-list no-border>
					  <div v-for="finding of categoryFindings.findings" :key="finding._id" :style="`--active-bg-color: ${lighterFindingColor(finding)}`">
						<q-item
						  dense
						  class="cursor-pointer"
						  :to="'/audits/'+auditId+'/findings/'+finding._id"
						  active-class="active-background"
						>
						  <q-item-section side v-if="!categoryFindings.sortOption.sortAuto && frontEndAuditState === AUDIT_VIEW_STATE.EDIT">
							<q-icon name="mdi-arrow-split-horizontal" class="cursor-pointer handle" color="grey" />
						  </q-item-section>
						  <q-item-section side>
							<q-chip
							  class="text-white"
							  size="sm"
							  square
							  :style="`background: ${getFindingColor(finding)}`"
							>{{getFindingSeverity(finding).substring(0,1)}}</q-chip>
						  </q-item-section>
						  <q-item-section>
							<span>{{finding.title}}</span>
						  </q-item-section>
						  <q-item-section side>
							<q-icon v-if="audit.type === 'default' && finding.status === 0" name="check" color="green" />
							<q-icon v-else-if="audit.type === 'retest' && finding.retestStatus === 'ok'" name="check" color="green" />
							<q-icon v-else-if="audit.type === 'retest' && finding.retestStatus === 'ko'" name="fas fa-xmark" color="red" />
							<q-icon v-else-if="audit.type === 'retest' && finding.retestStatus === 'partial'" name="priority_high" color="orange" />
							<q-icon v-else-if="audit.type === 'retest' && finding.retestStatus === 'unknown'" name="question_mark" color="brown" />
						  </q-item-section>
						</q-item>
						<div class="row">
							<div v-for="(user,idx) in getUsersForFinding(finding._id)" :key="idx"
								class="col multi-colors-bar" 
								:style="{background:user.color}"/>
						</div>
					  </div>
					</q-list>
				  </div>
				</div>
  
				<q-separator class="q-my-sm" />
			  </div>
			  <q-list v-for="section of audit.sections" :key="section._id">
				<q-item :to="'/audits/'+auditId+'/sections/'+section._id">
				  <q-item-section avatar>
					<q-icon :name="getSectionIcon(section)"></q-icon>
				  </q-item-section>
				  <q-item-section>
					<span>{{section.name}}</span>
				  </q-item-section>
				</q-item>
				<div class="row">
				  <div v-for="(user,idx) in sectionUsers" :key="idx" v-if="user.section === section._id" class="col multi-colors-bar" :style="{background:user.color}" />
				</div>
			  </q-list>
			</q-list>
		  </template>
		  <template #after>
			<q-list>
			  <q-separator />
			  <q-item class="q-py-lg">
				<q-item-section avatar>
				  <q-icon name="fa fa-user"></q-icon>
				</q-item-section>
				<q-item-section>{{t('usersConnected')}}</q-item-section>
			  </q-item>
			  <q-list dense>
				<q-item v-for="user of users" :key="user._id">
				  <q-item-section side>
					<q-chip :style="{'background-color':user.color}" square size="sm" />
				  </q-item-section>
				  <q-item-section>
					<span v-if="user.me">{{user.username}} ({{t('me')}})</span>
					<span v-else>{{user.username}}</span>
				  </q-item-section>
				</q-item>
			  </q-list>
			</q-list>
		  </template>
		</q-splitter>
	  </q-drawer>
	  <router-view :key="$route.fullPath" :frontEndAuditState="frontEndAuditState" :parentState="audit.state" :parentApprovals="audit.approvals" />
	</div>
  </template>
  
  <script>
  import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
  import { Notify, QSpinnerGears } from 'quasar';
  import draggable from 'vue3-draggable';
  import AuditService from '@/services/audit';
  import { user, refreshToken, isAllowed } from '@/services/user';
  import DataService from '@/services/data';
  import Utils from '@/services/utils';
  import { useI18n } from 'vue-i18n';
  import { useRouter, useRoute } from 'vue-router';
  import { settings } from '@/boot/settings';
  import { socket }  from '@/boot/socketio';
  
  export default {
	setup() {
	  const { t } = useI18n();
	  const router = useRouter();
	  const route = useRoute();
	  const auditId = ref("");
	  const findings = ref([]);
	  const users = ref([]);
	  const audit = reactive({ findings: {} });
	  const sections = ref([]);
	  const splitterRatio = ref(80);
	  const loading = ref(true);
	  const vulnCategories = ref([]);
	  const customFields = ref([]);
	  const auditTypes = ref([]);
	  const findingList = ref([]);
	  const frontEndAuditState = ref(Utils.AUDIT_VIEW_STATE.EDIT_READONLY);
	  const AUDIT_VIEW_STATE = Utils.AUDIT_VIEW_STATE;
	  const tabAttach = ref([{ isAttachement: false }]);
	  const commentMode = ref(false)
	  const editComment = ref("")
	  const editReply = ref("")
	  const generalUsers = computed(() => users.value.filter(user => user.menu === 'general'));
	  const networkUsers = computed(() => users.value.filter(user => user.menu === 'network'));
	  const sectionUsers = computed(() => users.value.filter(user => user.menu === 'editSection'));
  
	  const currentAuditType = computed(() => auditTypes.value.find(e => e.name === audit.auditType));

	  const lightenColor = (color, percent) => {
		const num = parseInt(color.replace("#", ""), 16),
		amt = Math.round(2.55 * percent),
		R = (num >> 16) + amt,
		G = (num >> 8 & 0x00FF) + amt,
		B = (num & 0x0000FF) + amt;
		return `#${(0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)}`;
    };

    const lighterFindingColor = (finding) => lightenColor(getFindingColor(finding), 70);
  
	  const getFindingColor = (finding) => {
			let severity = getFindingSeverity(finding)

			if(settings.report) {
				const severityColorName = `${severity.toLowerCase()}Color`;
				const cvssColors = settings.report.public.cvssColors;

				return cvssColors[severityColorName] || cvssColors.noneColor;
			} else {
				switch(severity) {
					case "Low": 
						return "green";
					case "Medium":
						return "orange";
					case "High":
						return "red";
					case "Critical":
						return "black";
					default:
						return "blue";
				}
			}
	  };

	  const getUsersForFinding = (findingId) => {
			return users.value.filter(user => 
				user.menu === 'editFinding' && user.finding === findingId
			)
	  };
  
	  const getFindingSeverity = (finding) => {
			let severity = "None"
			var cvss;
			if(finding.cvss.cvssv3) {
				cvss = CVSS31.calculateCVSSFromVector(finding.cvss.cvssv3)
			}
			else{
				cvss = CVSS4.calculateCVSSFromVector(finding.cvss.cvssv4)
			}
			try {
				if (cvss) {
				severity = cvss.baseSeverity
				let category = finding.category || "No Category"
				let sortOption = audit.sortFindings.find(e => e.category === category)

				if (sortOption) {
					if (sortOption.sortValue === "cvssEnvironmentalScore")
						severity = cvss.environmentalSeverity
					else if (sortOption.sortValue === "cvssTemporalScore")
						severity = cvss.temporalSeverity
				}
				}
			}
			catch (err) {
				console.log(err)
			}
			return severity
	  };
  
	  const getMenuSection = () => {
		if (router.currentRoute.value.name && router.currentRoute.value.name === 'general')
		  return { menu: 'general', room: auditId.value };
		else if (router.currentRoute.value.name && router.currentRoute.value.name === 'network')
		  return { menu: 'network', room: auditId.value };
		else if (router.currentRoute.value.name && router.currentRoute.value.name === 'addFindings')
		  return { menu: 'addFindings', room: auditId.value };
		else if (router.currentRoute.value.name && router.currentRoute.value.name === 'editFinding' && router.currentRoute.value.params.findingId)
		  return { menu: 'editFinding', finding: router.currentRoute.value.params.findingId, room: auditId.value };
		else if (router.currentRoute.value.name && router.currentRoute.value.name === 'editSection' && router.currentRoute.value.params.sectionId)
		  return { menu: 'editSection', section: router.currentRoute.value.params.sectionId, room: auditId.value };
  
		return { menu: 'undefined', room: auditId.value };
	  };
  
	  const handleSocket = () => {
		socket.emit('join', { username: user.value.username, room: auditId.value });
		socket.on('roomUsers', (newusers) => {
		  var userIndex = 0;
		  users.value = newusers.map((newuser, index) => {
			if (user.value.username !== newuser.username) {
			  newuser.color = "#77C84E";
			  newuser.me = true;
			  userIndex = index;
			}
			return newuser;
		  });
		  users.value.unshift(users.value.splice(userIndex, 1)[0]);
		});
		socket.on('updateUsers', () => {
		  socket.emit('updateUsers', { room: auditId.value });
		});
		socket.on('updateAudit', () => {
		  getAudit();
		});
		socket.on('disconnect', () => {
		  socket.emit('join', { username: user.value.username, room: auditId.value });
		  socket.emit('menu', getMenuSection());
		});
	  };
  
	  const isUserAReviewer = () => {
		var isAuthor = audit.creator._id === user.id;
		var isCollaborator = audit.collaborators.some((element) => element._id === user.id);
		var isReviewer = audit.reviewers.some((element) => element._id === user.id);
		var hasReviewAll = isAllowed('audits:review-all');
		return !(isAuthor || isCollaborator) && (isReviewer || hasReviewAll);
	  };
  
	  const isUserAnEditor = () => {
		  const isAuthor = audit.creator._id === user.value.id;
		  const isCollaborator = audit.collaborators.some(element => element._id === user.id);
		  const hasUpdateAll = isAllowed('audits:update-all');
		  const isEditor = isAuthor || isCollaborator || hasUpdateAll;
		  return isEditor;
	  };
  
	  const userHasAlreadyApproved = () => {
		return audit.approvals.some((element) => element._id === user.id);
	  };
  
	  const getUIState = () => {
		if (!settings?.reviews?.enabled || audit.state === "EDIT") {
		  frontEndAuditState.value = isUserAnEditor() ? Utils.AUDIT_VIEW_STATE.EDIT : Utils.AUDIT_VIEW_STATE.EDIT_READONLY;
		} else if (audit.state === "REVIEW") {
		  if (!isUserAReviewer()) {
			frontEndAuditState.value = isUserAnEditor() ? Utils.AUDIT_VIEW_STATE.REVIEW_EDITOR : Utils.AUDIT_VIEW_STATE.REVIEW_READONLY;
			return;
		  }
		  if (isUserAnEditor()) {
			frontEndAuditState.value = userHasAlreadyApproved() ? Utils.AUDIT_VIEW_STATE.REVIEW_ADMIN_APPROVED : Utils.AUDIT_VIEW_STATE.REVIEW_ADMIN;
			return;
		  }
		  frontEndAuditState.value = userHasAlreadyApproved() ? Utils.AUDIT_VIEW_STATE.REVIEW_APPROVED : Utils.AUDIT_VIEW_STATE.REVIEW;
		} else if (audit.state === "APPROVED") {
		  if (!isUserAReviewer()) {
			frontEndAuditState.value = Utils.AUDIT_VIEW_STATE.APPROVED_READONLY;
		  } else {
			frontEndAuditState.value = userHasAlreadyApproved() ? Utils.AUDIT_VIEW_STATE.APPROVED_APPROVED : Utils.AUDIT_VIEW_STATE.APPROVED;
		  }
		}
	  };
  
	  const getAudit = () => {
		DataService.getVulnerabilityCategories() // Vuln Categories must exist before getting audit data for handling default sort options
		  .then(data => {
			vulnCategories.value = data.data.datas;
  
			return AuditService.getAudit(auditId.value);
		  })
		  .then((data) => {
		  Object.assign(audit, data.data.datas);
			getUIState();
			getSections();
			if (loading.value)
			  handleSocket();
			loading.value = false;
		  })
		  .catch((err) => {
			console.log(err);
			if (err.response.status === 403)
			  router.push({ name: '403', params: { error: err.response.data.datas } });
			else if (err.response.status === 404)
			  router.push({ name: '404', params: { error: err.response.data.datas } });
		  });
	  };
	  const updateFindingList = () => {
			const result = _.chain(audit.findings)
		  .groupBy("category")
		  .map((value, key) => {
			if (key === 'undefined') key = 'No Category';
			let sortOption = audit.sortFindings.find(option => option.category === key); // Get sort option saved in audit
  
			if (!sortOption) { // no option for category in audit
			  sortOption = vulnCategories.value.find(e => e.name === key); // Get sort option from default in vulnerability category
			  if (sortOption) // found sort option from vuln categories
				sortOption.category = sortOption.name;
			  else // no default option or category don't exist
				sortOption = { category: key, sortValue: 'cvssScore', sortOrder: 'desc', sortAuto: true }; // set a default sort option
  
			  audit.sortFindings.push({
				category: sortOption.category,
				sortValue: sortOption.sortValue,
				sortOrder: sortOption.sortOrder,
				sortAuto: sortOption.sortAuto
			  });
			}
			return { category: key, findings: value, sortOption: sortOption };
		  })
		  .value();
  
		findingList.value = result;
	  };
  
	  watch(
		() => audit.findings,
		(newVal, oldVal) => {
		  updateFindingList();
		},
		{ deep: true, immediate: true }
	  );
  
	  const getCustomFields = () => {
		DataService.getCustomFields()
		  .then((data) => {
			customFields.value = data.data.datas;
		  })
		  .catch((err) => {
			console.log(err);
		  });
	  };
  
	  const getSections = () => {
		DataService.getSections()
		  .then((data) => {
			sections.value = data.data.datas;
		  })
		  .catch((err) => {
			console.log(err);
		  });
	  };
	  const getSortOptions = (category) => {
			  var options = [
				  {label: t('cvssScore'), value: 'cvssScore'},
				  {label: t('cvssTemporalScore'), value: 'cvssTemporalScore'},
				  {label: t('cvssEnvironmentalScore'), value: 'cvssEnvironmentalScore'},
				  {label: t('priority'), value: 'priority'},
				  {label: t('remediationDifficulty'), value: 'remediationComplexity'}
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
		  };
  
	  const getSectionIcon = (section) => {
		var section = sections.value.find(e => e.field === section.field);
		if (section)
		  return section.icon || 'notes';
		return 'notes';
	  };
  
	  const getAuditTypes = () => {
		DataService.getAuditTypes()
		  .then((data) => {
			auditTypes.value = data.data.datas;
		  })
		  .catch((err) => {
			console.log(err);
		  });
	  };
  
	  const BlobReader = (data) => {
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
  
	  const generateReport = async () => {
		  AuditService.generateAuditReport(audit._id)
		  .then(response => {
			  var blob = new Blob([response.data], {type: "application/octet-stream"});
			  var link = document.createElement('a');
			  link.href = window.URL.createObjectURL(blob);
			  const title = audit.name.concat('_','report','.docx')
			  link.download = title
			  document.body.appendChild(link);
			  link.click();
			  link.remove();
			  Notify.create({
				  message: "Report generated",
				  color: 'positive',
				  position: 'top-right',
				  timeout: 5000
			  });
		  })
		  
		  .catch( async err => {
			  if (err.response && err.response.data) {
				  var blob = new Blob([err.response.data], {type: "application/json"})
				  var blobData = BlobReader(blob)
				  const message = JSON.parse(blobData).datas
			  }
			  Notify.create({
				  message: "Error generating report: " + err,
				  color: 'negative',
				  position: 'top-right',
				  timeout: 5000
			  })
		  })
	  };
  
	  onMounted(() => {
		auditId.value = route.params.auditId;
		getCustomFields();
		getAuditTypes();
		getAudit(); // Calls getSections
	  });
  
	  onUnmounted(() => {
		if (!loading.value) {
		  socket.emit('leave', { username: user.value.username, room: auditId.value });
		  socket.off();
		}
	  });
  
	  return {
		t,
		generateReport,
		auditId,
		router,
		findings,
		findingList,
		settings,
		users,
		user,
		commentMode,
		audit,
		sections,
		splitterRatio,
		loading,
		vulnCategories,
		customFields,
		auditTypes,
		findingList,
		frontEndAuditState,
		AUDIT_VIEW_STATE,
		tabAttach,
		generalUsers,
		networkUsers,
		sectionUsers,
		currentAuditType,
		getFindingColor,
		getFindingSeverity,
		getMenuSection,
		handleSocket,
		isUserAReviewer,
		isUserAnEditor,
		userHasAlreadyApproved,
		getUIState,
		getAudit,
		getCustomFields,
		getSections,
		getSectionIcon,
		getAuditTypes,
		BlobReader,
		getSortOptions,
		lighterFindingColor,
		getUsersForFinding
	  };
	},
	components: {
	  draggable
	}
  };
  </script>
  
  <style lang="stylus">
  .edit-container {
		  margin-top: 50px;
		  /*margin-left: 0px; Cancel q-col-gutter-md for left*/
		  /*margin-right: 16px; Cancel q-col-gutter-md for right*/
  }
  
  .edit-breadcrumb {
		  position: fixed;
		  top: 50px;
		  right: 0;
		  left: 300px;
		  z-index: 1;
  }
  
  .q-menu > .q-item--active {
		  color: white;
		  background-color: $blue-14;
  }
  
  .card-screenshots {
	  height: calc(100vh - 120px); /* 100% Full-height */
	  overflow-x: hidden; /* Disable horizontal scroll */
	  margin-right: 16px;
  }
  
  .affix {
	  width: calc(16.6667% - 69px);
  }
  
  .caption-text input {
		  text-align: center;
  }
  
  .multi-colors-bar {
	  height: 5px;
  }
  
  .drawer-footer {
	  // left: 0!important;
	  // height: 30%;
	  background-color: white;
	  color: black;
	  font-size: 12px;
  }
  
  .edit-drawer {
	  // height: 70%;
  
  }
  
  .topButtonSection {
	  padding-left: 0px!important;
	  padding-right: 0px!important;
  }

  .custom-active-item {
	/* Subtle background for active state */
	background-color: rgba(0, 0, 0, 0.05) !important;
  }
  
  body.body--dark .custom-active-item {
	/* Dark mode: very subtle light gray with some opacity */
	background-color: rgba(255, 255, 255, 0.1) !important;
  }

  .custom-q-item {
	color: black !important;
  }
  .custom-q-item .q-item__section {
	color: black !important;
  }

  .active-background {
	color: black !important;
	background-color: var(--active-bg-color);
  }
  </style>
  
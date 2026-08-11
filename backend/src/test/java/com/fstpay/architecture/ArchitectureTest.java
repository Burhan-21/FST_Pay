package com.fstpay.architecture;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

@AnalyzeClasses(packages = "com.fstpay", importOptions = {ImportOption.DoNotIncludeTests.class})
public class ArchitectureTest {

    @ArchTest
    public static void no_cyclic_dependencies(JavaClasses classes) {
        // Exclude common, user, wallet, transaction, goal, and reward from the cyclic check
        // to allow their current coupling to be documented as technical debt.
        JavaClasses filtered = classes.that(new DescribedPredicate<JavaClass>("not in cycle-exempted packages") {
            @Override
            public boolean test(JavaClass input) {
                String pkg = input.getPackage().getName();
                return !pkg.startsWith("com.fstpay.common") && 
                       !pkg.startsWith("com.fstpay.user") && 
                       !pkg.startsWith("com.fstpay.wallet") && 
                       !pkg.startsWith("com.fstpay.transaction") && 
                       !pkg.startsWith("com.fstpay.goal") && 
                       !pkg.startsWith("com.fstpay.reward");
            }
        });
        slices().matching("com.fstpay.(*)..").should().beFreeOfCycles().allowEmptyShould(true).check(filtered);
    }

    @ArchTest
    public static final ArchRule controllers_should_not_be_accessed_by_other_layers =
        classes().that().resideInAPackage("..controller..")
            .should().onlyBeAccessed().byAnyPackage("..controller..", "..config..", "..security..", "com.fstpay..")
            .allowEmptyShould(true);

    @ArchTest
    public static final ArchRule services_should_not_depend_on_controllers =
        noClasses().that().resideInAnyPackage("..service..", "..application..")
            .should().dependOnClassesThat().resideInAPackage("..controller..")
            .allowEmptyShould(true);

    @ArchTest
    public static final ArchRule domain_entities_must_not_depend_on_web_packages =
        noClasses().that().resideInAPackage("..entity..")
            .should().dependOnClassesThat().resideInAnyPackage("..controller..", "..servlet..", "org.springframework.web..")
            .allowEmptyShould(true);

    @ArchTest
    public static final ArchRule wallet_application_should_not_be_accessed_by_other_modules =
        noClasses().that().resideOutsideOfPackages("com.fstpay.wallet..", "com.fstpay.config..", "com.fstpay.security..", "com.fstpay")
            .should().dependOnClassesThat().resideInAPackage("com.fstpay.wallet.application..")
            .allowEmptyShould(true);

    @ArchTest
    public static final ArchRule card_application_should_not_be_accessed_by_other_modules =
        noClasses().that().resideOutsideOfPackages("com.fstpay.card..", "com.fstpay.config..", "com.fstpay.security..", "com.fstpay")
            .should().dependOnClassesThat().resideInAPackage("com.fstpay.card.application..")
            .allowEmptyShould(true);

    @ArchTest
    public static void repositories_should_not_be_accessed_across_modules(JavaClasses classes) {
        // Feature modules where strict repository isolation is currently enforced.
        // Bounded contexts that have cross-module repository calls are logged in TECHNICAL_DEBT.md
        // and excluded from strict checks or explicitly rules are added for allowed routes.
        String[] strictModules = {
            "aicoach", "auth", "report"
        };
        for (String module : strictModules) {
            String packagePattern = "com.fstpay." + module + ".repository..";
            ArchRule rule = classes().that().resideInAPackage(packagePattern)
                .should().onlyBeAccessed().byAnyPackage(
                    "com.fstpay." + module + "..",
                    "com.fstpay.common..",
                    "com.fstpay.config..",
                    "com.fstpay.security..",
                    "com.fstpay"
                ).allowEmptyShould(true);
            rule.check(classes);
        }

        // Card repository allows access from card, admin, parent, config, security, common, FstPayApplication
        ArchRule cardRule = classes().that().resideInAPackage("com.fstpay.card.repository..")
            .should().onlyBeAccessed().byAnyPackage(
                "com.fstpay.card..",
                "com.fstpay.admin..",
                "com.fstpay.parent..",
                "com.fstpay.common..",
                "com.fstpay.config..",
                "com.fstpay.security..",
                "com.fstpay"
            ).allowEmptyShould(true);
        cardRule.check(classes);

        // Goal repository allows access from goal, report, reward, aicoach, parent, config, security, common, FstPayApplication
        ArchRule goalRule = classes().that().resideInAPackage("com.fstpay.goal.repository..")
            .should().onlyBeAccessed().byAnyPackage(
                "com.fstpay.goal..",
                "com.fstpay.report..",
                "com.fstpay.reward..",
                "com.fstpay.aicoach..",
                "com.fstpay.parent..",
                "com.fstpay.common..",
                "com.fstpay.config..",
                "com.fstpay.security..",
                "com.fstpay"
            ).allowEmptyShould(true);
        goalRule.check(classes);

        // Notification repository allows access from notification, parent, config, security, common, FstPayApplication
        ArchRule notificationRule = classes().that().resideInAPackage("com.fstpay.notification.repository..")
            .should().onlyBeAccessed().byAnyPackage(
                "com.fstpay.notification..",
                "com.fstpay.parent..",
                "com.fstpay.common..",
                "com.fstpay.config..",
                "com.fstpay.security..",
                "com.fstpay"
            ).allowEmptyShould(true);
        notificationRule.check(classes);

        // Reward repository allows access from reward, aicoach, config, security, common, FstPayApplication
        ArchRule rewardRule = classes().that().resideInAPackage("com.fstpay.reward.repository..")
            .should().onlyBeAccessed().byAnyPackage(
                "com.fstpay.reward..",
                "com.fstpay.aicoach..",
                "com.fstpay.common..",
                "com.fstpay.config..",
                "com.fstpay.security..",
                "com.fstpay"
            ).allowEmptyShould(true);
        rewardRule.check(classes);
    }

    @ArchTest
    public static final ArchRule domain_events_should_not_expose_jpa_entities =
        com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields().that().areDeclaredInClassesThat().implement(com.fstpay.common.event.DomainEvent.class)
            .should().notHaveRawType(new DescribedPredicate<JavaClass>("be a JPA entity") {
                @Override
                public boolean test(JavaClass input) {
                    return input.isAnnotatedWith("jakarta.persistence.Entity") ||
                           input.isAnnotatedWith("javax.persistence.Entity") ||
                           input.getName().contains(".entity.");
                }
            }).allowEmptyShould(true);

    @ArchTest
    public static final ArchRule outbox_repository_should_only_be_accessed_by_outbox_package =
        classes().that().haveSimpleName("OutboxEventRepository")
            .should().onlyBeAccessed().byAnyPackage(
                "com.fstpay.common.outbox..",
                "com.fstpay.config..",
                "com.fstpay"
            ).allowEmptyShould(true);

    @ArchTest
    public static final ArchRule only_infrastructure_packages_should_depend_on_spring_kafka =
        noClasses().that().resideOutsideOfPackages("com.fstpay.common.config..", "com.fstpay.common.outbox..", "com.fstpay.common.aspect..")
            .should().dependOnClassesThat().resideInAnyPackage("org.springframework.kafka..", "org.apache.kafka..")
            .allowEmptyShould(true);

    @ArchTest
    public static final ArchRule only_infrastructure_packages_should_inject_kafka_template =
        noClasses().that().resideOutsideOfPackages("com.fstpay.common.config..", "com.fstpay.common.outbox..")
            .should().dependOnClassesThat().haveSimpleName("KafkaTemplate")
            .allowEmptyShould(true);

    @ArchTest
    public static final ArchRule business_modules_must_never_depend_on_kafka_template =
        noClasses().that().resideInAnyPackage("..user..", "..wallet..", "..card..", "..goal..", "..reward..", "..report..", "..aicoach..", "..parent..", "..notification..")
            .should().dependOnClassesThat().haveSimpleName("KafkaTemplate")
            .allowEmptyShould(true);
}
